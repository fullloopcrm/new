/**
 * POST /api/ingest/lead -- fuzzy phone-substring cross-client overwrite.
 *
 * The existing-client dedupe lookup used `.ilike('phone', '%<last-10-digits>%')`
 * gated only by `cleanPhone.length >= 7`. A 7-9 digit (malformed/partial)
 * phone number matched via substring against ANY client's stored phone in
 * the tenant -- e.g. a submitted phone "5551234" would match a stored
 * "12125551234" -- and the route then WROTE the submitter's name/email/notes
 * onto that unrelated client's row, plus flipped it active/status='active'.
 * Same bug class already fixed in client/collect + client/check + verify-code's
 * phone lookup, just recurring here with a lower (7, not 10) length floor and
 * still ilike-substring instead of exact match. This route is reachable from
 * any standalone site holding the shared INGEST_SECRET, so the malformed
 * phone is fully attacker-controlled.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

process.env.INGEST_SECRET = 'test-ingest-secret'

const UNRELATED_CLIENT = {
  id: 'unrelated-client-1',
  tenant_id: 'tenant-1',
  name: 'Unrelated Existing Client',
  email: 'unrelated@example.com',
  phone: '12125551234',
  status: 'active',
}

let clients: (typeof UNRELATED_CLIENT)[] = []
let updateCalls: { id: string; patch: Record<string, unknown> }[] = []
let insertCalls: { table: string; row: Record<string, unknown> }[] = []

const getTenantBySlug = vi.hoisted(() => vi.fn(async () => ({ id: 'tenant-1', name: 'Acme' })))
vi.mock('@/lib/tenant-lookup', () => ({ getTenantBySlug }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 4 })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: vi.fn(() => ({ subject: 'x', html: 'x' })) }))
vi.mock('@/lib/tenant-site', () => ({ tenantSiteUrl: vi.fn(() => 'https://acme.example.com') }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))

function chain(result: { data: unknown; error?: unknown }) {
  const q: Record<string, unknown> = {
    eq: () => q,
    in: () => q,
    limit: () => q,
    ilike: () => q,
    order: () => q,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  }
  return q
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => {
        if (table === 'clients') {
          return chain({ data: clients.filter((c) => c.tenant_id === 'tenant-1') })
        }
        // deals lookup — no open deal, matches default "insert a fresh deal" path
        return chain({ data: null })
      },
      update: (patch: Record<string, unknown>) => {
        const upd: Record<string, unknown> = {
          eq(_col: string, val: string) {
            if (_col === 'id') (upd as { __id?: string }).__id = val
            return upd
          },
          select: () => upd,
          single: async () => {
            const id = (upd as { __id?: string }).__id!
            const row = clients.find((c) => c.id === id)
            if (!row) return { data: null, error: new Error('not found') }
            updateCalls.push({ id, patch })
            return { data: { ...row, ...patch }, error: null }
          },
        }
        return upd
      },
      insert: (row: Record<string, unknown>) => {
        insertCalls.push({ table, row })
        return {
          select: () => ({ single: () => Promise.resolve({ data: { id: 'new-client-1' }, error: null }) }),
          then: (resolve: (v: unknown) => void) => resolve({ error: null }),
        }
      },
    }),
  },
}))

import { POST } from './route'

function ingestReq(phone: string): Request {
  const body = { tenant_slug: 'acme', name: 'Attacker Name', email: 'attacker@evil.com', phone }
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9', 'x-ingest-secret': 'test-ingest-secret' }),
    json: async () => body,
  } as unknown as Request
}

describe('POST /api/ingest/lead — phone dedupe match', () => {
  beforeEach(() => {
    clients = [{ ...UNRELATED_CLIENT }]
    updateCalls = []
    insertCalls = []
  })

  it('does NOT match an unrelated client via a malformed 7-digit phone substring (creates new client instead)', async () => {
    const res = await POST(ingestReq('5551234'))
    expect(res.status).toBe(200)
    expect(updateCalls).toHaveLength(0)
    expect(insertCalls.some((c) => c.table === 'clients')).toBe(true)
  })

  it('CONTROL: still dedupes/updates when the submitted phone exactly matches the existing client (10-digit national number)', async () => {
    const res = await POST(ingestReq('2125551234'))
    expect(res.status).toBe(200)
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].id).toBe(UNRELATED_CLIENT.id)
    expect(updateCalls[0].patch).toMatchObject({ name: 'Attacker Name', email: 'attacker@evil.com' })
  })

  it('CONTROL: still dedupes when the submitted phone includes a leading US country code (11 digits)', async () => {
    const res = await POST(ingestReq('12125551234'))
    expect(res.status).toBe(200)
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].id).toBe(UNRELATED_CLIENT.id)
  })
})
