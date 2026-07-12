import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 INDEPENDENT verification lane for the client/* IDOR fix (c8976a6f).
 *
 * Fix c8976a6f stopped deriving the tenant from the body/query client_id and
 * instead resolves it from the signed request context (getTenantFromHeaders)
 * then gates on protectClientAPI(tenant.id, client_id). The fix's own suite
 * (client-idor.test.ts) proves a same-tenant forged client_id -> 403 and
 * no-session -> 401 with zero writes.
 *
 * This independently-authored suite locks THREE complementary properties that
 * sibling does NOT assert:
 *
 *   1. CROSS-TENANT SESSION REPLAY IS REJECTED — a session validly signed for
 *      CLIENT_A in TENANT_A, replayed while the request's tenant context is
 *      TENANT_B, is rejected (401). The pre-fix route had NO session check and
 *      derived the tenant from the client row, so this vector was wide open.
 *
 *   2. SCOPING USES THE SESSION TENANT, NOT THE CLIENT ROW — the preferred-
 *      cleaner GET allow-path reads carry tenant_id = the SESSION tenant even
 *      when the returned client row advertises a DIFFERENT tenant_id. Pre-fix,
 *      the bookings read used `client.tenant_id` (row-derived); this proves the
 *      switch to `tenant.id`.
 *
 *   3. RECURRING TEAM-MEMBER HARDENING — with a fully valid session (gate
 *      PASSES: status is 400, not 401/403), a caller-supplied cleaner_id that
 *      does not belong to THIS tenant is rejected with 'Invalid cleaner
 *      selection' and NO schedule/booking is inserted. Sibling never exercises
 *      this new block at all.
 *
 * protectClientAPI + createClientSession run for real against a minted cookie.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-000000000002'
const CLIENT_A = '11111111-0000-0000-0000-000000000001'
const FOREIGN_CLEANER = 'cleaner-in-another-tenant'

const mockCookie = { value: undefined as string | undefined }
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (_n: string) => (mockCookie.value ? { value: mockCookie.value } : undefined) }),
}))

const tenantCtx: { value: { id: string } | null } = { value: { id: TENANT_A } }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx.value }))

type Eqs = Record<string, unknown>
type Resolved = { data: unknown; error: unknown }
let clientRow: Record<string, unknown> | null
const reads: Array<{ table: string; eqs: Eqs }> = []
const writes: { inserts: Array<{ table: string }>; updates: Array<{ table: string }> } = { inserts: [], updates: [] }

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Eqs = {}
    let kind: 'read' | 'insert' | 'update' = 'read'
    const c: Record<string, unknown> = {
      select: () => c,
      insert: () => { kind = 'insert'; writes.inserts.push({ table }); return c },
      update: () => { kind = 'update'; writes.updates.push({ table }); return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      in: () => c,
      not: () => c,
      order: () => c,
      limit: () => c,
      single: async (): Promise<Resolved> => {
        reads.push({ table, eqs: { ...eqs } })
        if (table === 'clients') return { data: clientRow, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: Resolved) => unknown) => {
        if (kind === 'read') reads.push({ table, eqs: { ...eqs } })
        return res({ data: [], error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

// Downstream deps reachable only AFTER the gate — stub so imports are clean.
vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok' }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({
  sendClientEmail: async () => {}, sendClientSMS: async () => ({ sent: 0, skipped: 0 }),
}))
vi.mock('@/lib/messaging/client-email', () => ({ confirmationEmailFor: async () => ({ subject: '', html: '' }) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '' }) }))

import { createClientSession } from '@/lib/client-auth'
import { POST as recurringPOST } from './recurring/route'
import { GET as preferredGET } from './preferred-cleaner/route'

beforeEach(() => {
  process.env.PORTAL_SECRET = 'unit-test-portal-secret'
  mockCookie.value = undefined
  tenantCtx.value = { id: TENANT_A }
  // Client row: gate-passing (do_not_service false) but advertises a DIFFERENT
  // tenant_id in its payload, so we can prove reads use the SESSION tenant.
  clientRow = { do_not_service: false, preferred_team_member_id: null, tenant_id: 'ROW-TENANT-DIFFERENT' }
  reads.length = 0
  writes.inserts = []
  writes.updates = []
})

// ── 1. Cross-tenant session replay ──────────────────────────────────────────

describe('W4 client-IDOR: a session for tenant A cannot act on tenant B', () => {
  it('recurring REJECTS (401) a valid CLIENT_A/TENANT_A session when the request tenant context is TENANT_B — no writes', async () => {
    mockCookie.value = createClientSession(CLIENT_A, TENANT_A)
    tenantCtx.value = { id: TENANT_B } // attacker on tenant B's subdomain
    const req = new Request('https://x/api/client/recurring', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_A, frequency: 'weekly', start_date: '2099-08-01', time: '10:00', hours: 3 }),
    })
    const res = await recurringPOST(req)
    expect(res.status).toBe(401)
    expect(writes.inserts).toHaveLength(0)
  })
})

// ── 2. Reads use the session tenant, not the client row's tenant ────────────

describe('W4 client-IDOR: preferred-cleaner reads are scoped to the session tenant', () => {
  it('GET allow-path scopes the familiar-cleaners read to tenant.id even when the client row advertises another tenant', async () => {
    mockCookie.value = createClientSession(CLIENT_A, TENANT_A)
    const req = new Request(`https://x/api/client/preferred-cleaner?client_id=${CLIENT_A}`)
    const res = await preferredGET(req)
    expect(res.status).toBe(200)
    const bookingsReads = reads.filter((r) => r.table === 'bookings')
    expect(bookingsReads.length).toBeGreaterThan(0)
    for (const r of bookingsReads) {
      expect(r.eqs.tenant_id).toBe(TENANT_A) // session tenant, NOT 'ROW-TENANT-DIFFERENT'
      expect(r.eqs.tenant_id).not.toBe('ROW-TENANT-DIFFERENT')
    }
  })
})

// ── 3. Recurring team-member cross-tenant hardening ─────────────────────────

describe('W4 client-IDOR: recurring rejects a foreign cleaner_id after the gate passes', () => {
  it('a valid session but a cleaner_id not in this tenant -> 400 Invalid cleaner selection, tenant-scoped probe, zero inserts', async () => {
    mockCookie.value = createClientSession(CLIENT_A, TENANT_A)
    const req = new Request('https://x/api/client/recurring', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_A, frequency: 'weekly', start_date: '2099-08-01', time: '10:00', hours: 3,
        cleaner_id: FOREIGN_CLEANER,
      }),
    })
    const res = await recurringPOST(req)
    // 400 (not 401/403) proves the auth gate PASSED for the legit client, then the
    // NEW member-validation block rejected the cross-tenant cleaner.
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Invalid cleaner selection' })
    expect(writes.inserts).toHaveLength(0)
    const tmReads = reads.filter((r) => r.table === 'team_members')
    expect(tmReads.length).toBeGreaterThan(0)
    for (const r of tmReads) expect(r.eqs.tenant_id).toBe(TENANT_A)
  })
})
