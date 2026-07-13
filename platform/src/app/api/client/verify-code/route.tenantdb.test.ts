import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/client/verify-code.
 * Every verification_codes / clients query in this route used to carry a manual
 * .eq('tenant_id', tenant.id) filter — a single dropped filter would let a code
 * or client minted for one tenant resolve against another tenant's site. This
 * proves the tenantDb() wrapper still enforces that boundary.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    insert: (row: Row) => {
      const created = { id: `new-${rowsOf().length + 1}`, ...row }
      DB[table] = [...rowsOf(), created]
      const single = { select: () => single, single: async () => ({ data: created, error: null }) }
      return single
    },
    update: () => c,
    delete: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    ilike: () => c,
    order: () => c,
    limit: () => c,
    maybeSingle: async () => ({ data: matched()[0] || null, error: null }),
    single: async () => ({ data: matched()[0] || null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => ({ id: TENANT_A }) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/client-auth', () => ({
  createClientSession: () => 'session-token',
  clientSessionCookieOptions: () => ({ name: 'client_session', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 100, path: '/' }),
}))

import { POST } from './route'

beforeEach(() => {
  DB.verification_codes = []
  DB.clients = []
})

describe('POST /api/client/verify-code — tenantDb scoping', () => {
  it('REJECTS a code that only exists for another tenant, even with the right identifier + code', async () => {
    DB.verification_codes.push({ tenant_id: TENANT_B, identifier: 'foreign@x.com', code: '123456', expires_at: '2099-01-01T00:00:00Z' })

    const req = new Request('https://x', { method: 'POST', body: JSON.stringify({ email: 'foreign@x.com', code: '123456' }) })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Invalid code')
  })

  it('does not resolve a phone-matching client that belongs to a foreign tenant', async () => {
    DB.verification_codes.push({ tenant_id: TENANT_A, identifier: 'sms:5551234567', code: '654321', expires_at: '2099-01-01T00:00:00Z' })
    DB.clients.push({ id: 'client-foreign', tenant_id: TENANT_B, phone: '5551234567', email: null, do_not_service: false })

    const req = new Request('https://x', { method: 'POST', body: JSON.stringify({ phone: '5551234567', code: '654321' }) })
    const res = await POST(req)
    // No own-tenant client and no email supplied → cannot create/resolve an account.
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Could not resolve account')
  })

  it('ALLOWS an own-tenant client match on the same phone code', async () => {
    DB.verification_codes.push({ tenant_id: TENANT_A, identifier: 'sms:5559876543', code: '111222', expires_at: '2099-01-01T00:00:00Z' })
    DB.clients.push({ id: 'client-mine', tenant_id: TENANT_A, phone: '5559876543', email: null, do_not_service: false })

    const req = new Request('https://x', { method: 'POST', body: JSON.stringify({ phone: '5559876543', code: '111222' }) })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.client.id).toBe('client-mine')
  })
})
