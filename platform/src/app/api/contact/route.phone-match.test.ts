/**
 * POST /api/contact -- lead branch, fuzzy phone-substring cross-client overwrite.
 *
 * The existing-client dedupe lookup used `.ilike('phone', '%<last-10-digits>%')`
 * with NO length floor at all (only `if (cleanPhone)`, i.e. any non-empty
 * digit string). A submitted phone of a single digit like "1" would
 * substring-match ANY client in the tenant whose phone contains "1" -- and
 * the route then WROTE the submitter's name/email/notes onto that unrelated
 * client's row, plus flipped it active/status='active'. Same bug class
 * already fixed on ingest/lead, client/collect, etc. This is a public
 * unauthenticated form (only IP rate-limited), so the malformed phone is
 * fully attacker-controlled.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

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

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1', name: 'Acme', slug: 'acme' })),
  tenantSiteUrl: vi.fn(() => 'https://acme.example.com'),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 2 })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}), tenantSender: vi.fn(() => 'Acme <hello@acme.example.com>') }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: vi.fn(() => ({ subject: 'x', html: 'x' })) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))

function chain(result: { data: unknown; error?: unknown }) {
  const q: Record<string, unknown> = {
    eq: () => q,
    ilike: () => q,
    limit: () => q,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    select: () => q,
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  }
  return q
}

// Filters `clients` on every `.eq()` applied, unlike the generic `chain()`
// above -- needed so the email-fallback branch doesn't spuriously "match"
// the unrelated client when the test's point is that phone-substring
// matching must NOT fire (the route falls back to an exact-match .eq('email',
// ...) lookup whenever the phone is too short to trust).
function clientsChain(rows: (typeof UNRELATED_CLIENT)[]) {
  let filtered = rows
  const q: Record<string, unknown> = {
    eq: (col: string, val: unknown) => {
      filtered = filtered.filter((r) => (r as Record<string, unknown>)[col] === val)
      return q
    },
    ilike: () => q,
    limit: () => q,
    single: () => Promise.resolve({ data: filtered[0] ?? null, error: filtered[0] ? null : new Error('not found') }),
    maybeSingle: () => Promise.resolve({ data: filtered[0] ?? null, error: null }),
    select: () => q,
    then: (resolve: (v: unknown) => void) => Promise.resolve({ data: filtered, error: null }).then(resolve),
  }
  return q
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => {
        if (table === 'clients') return clientsChain(clients.filter((c) => c.tenant_id === 'tenant-1'))
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

function contactReq(phone: string): NextRequest {
  const body = { name: 'Attacker Name', email: 'attacker@evil.com', phone }
  return new NextRequest('https://acme.example.com/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/contact — lead-branch phone dedupe match', () => {
  beforeEach(() => {
    clients = [{ ...UNRELATED_CLIENT }]
    updateCalls = []
    insertCalls = []
  })

  it('does NOT match an unrelated client via a single-digit phone (creates new client instead)', async () => {
    const res = await POST(contactReq('1'))
    expect(res.status).toBe(200)
    expect(updateCalls).toHaveLength(0)
    expect(insertCalls.some((c) => c.table === 'clients')).toBe(true)
  })

  it('does NOT match an unrelated client via a malformed 7-digit phone substring', async () => {
    const res = await POST(contactReq('5551234'))
    expect(res.status).toBe(200)
    expect(updateCalls).toHaveLength(0)
  })

  it('CONTROL: still dedupes/updates when the submitted phone exactly matches the existing client (10-digit national number)', async () => {
    const res = await POST(contactReq('2125551234'))
    expect(res.status).toBe(200)
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].id).toBe(UNRELATED_CLIENT.id)
    expect(updateCalls[0].patch).toMatchObject({ name: 'Attacker Name', email: 'attacker@evil.com' })
  })

  it('CONTROL: still dedupes when the submitted phone includes a leading US country code (11 digits)', async () => {
    const res = await POST(contactReq('12125551234'))
    expect(res.status).toBe(200)
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].id).toBe(UNRELATED_CLIENT.id)
  })
})
