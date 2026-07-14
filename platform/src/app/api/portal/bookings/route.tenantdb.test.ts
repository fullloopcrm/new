import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET/POST /api/portal/bookings
 * (client portal). GET carried a manual .eq('tenant_id', auth.tid).eq('client_id', auth.id);
 * this proves tenantDb() still excludes a foreign-tenant booking that happens to
 * share this client's id (id collision / caller bug), and that POST's insert is
 * stamped with the token's own tenant_id regardless of any other value.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let insertedRow: Row | null = null
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => ({ then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }) }),
    single: () => Promise.resolve({ data: insertedRow ?? matched()[0] ?? null, error: null }),
    insert: (row: Row) => { insertedRow = row; (DB[table] ||= []).push(row); return c },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ allow_same_day: true, min_days_ahead: 0 }),
}))
vi.mock('@/lib/nycmaid/recurring-discount', () => ({
  applyRecurringDiscount: (price: number) => price,
}))

let currentAuth: { id: string; tid: string } | null = { id: 'client-a', tid: TENANT_A }
vi.mock('../auth/token', () => ({
  verifyPortalToken: () => currentAuth,
}))

import { GET, POST } from './route'

beforeEach(() => {
  DB.bookings = [
    { id: 'booking-own', tenant_id: TENANT_A, client_id: 'client-a', start_time: '2026-08-01T09:00:00Z', team_members: null },
    // Same client id, different tenant -- must never appear in a TENANT_A response.
    { id: 'booking-foreign', tenant_id: TENANT_B, client_id: 'client-a', start_time: '2026-08-01T10:00:00Z', team_members: null },
  ]
  currentAuth = { id: 'client-a', tid: TENANT_A }
})

describe('GET /api/portal/bookings — tenantDb scoping', () => {
  it('excludes a foreign-tenant booking even when it shares this client id', async () => {
    const req = new Request('https://x', { headers: { authorization: 'Bearer tok' } })
    const res = await GET(req as unknown as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.bookings as Row[]).map((b) => b.id)
    expect(ids).toContain('booking-own')
    expect(ids).not.toContain('booking-foreign')
  })
})

describe('POST /api/portal/bookings — tenantDb stamping', () => {
  it('stamps the inserted booking with the token tenant, not a caller-supplied value', async () => {
    const req = new Request('https://x', {
      method: 'POST',
      headers: { authorization: 'Bearer tok' },
      body: JSON.stringify({ start_time: '2026-08-05T09:00:00Z', tenant_id: TENANT_B }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.booking.tenant_id).toBe(TENANT_A)
  })
})
