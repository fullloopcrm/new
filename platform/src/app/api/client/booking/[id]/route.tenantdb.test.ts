import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET /api/client/booking/[id].
 * A fake PostgREST layer applies every `.eq` predicate against a seeded
 * two-tenant dataset, so a route that silently reverted to unscoped
 * supabaseAdmin would leak the foreign tenant's booking here.
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
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => {
      const m = matched()
      return m[0] ? { data: m[0], error: null } : { data: null, error: { message: 'not found' } }
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

const tenantCtx: { value: { id: string } } = { value: { id: TENANT_A } }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx.value }))
vi.mock('@/lib/client-auth', () => ({ protectClientAPI: async (_t: string, clientId?: string) => ({ clientId }) }))

import { GET } from './route'

beforeEach(() => {
  DB.bookings = []
  tenantCtx.value = { id: TENANT_A }
})

describe('GET /api/client/booking/[id] — tenantDb scoping', () => {
  it('404s a booking that belongs to a different tenant', async () => {
    DB.bookings.push({ id: 'bk-1', tenant_id: TENANT_B, client_id: 'c-1', start_time: '2099-01-01' })
    const res = await GET(new Request('https://x'), { params: Promise.resolve({ id: 'bk-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns the booking when it belongs to the caller tenant', async () => {
    DB.bookings.push({ id: 'bk-2', tenant_id: TENANT_A, client_id: 'c-1', start_time: '2099-01-01' })
    const res = await GET(new Request('https://x'), { params: Promise.resolve({ id: 'bk-2' }) })
    expect(res.status).toBe(200)
  })
})
