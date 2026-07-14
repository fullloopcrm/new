import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET /api/client/bookings.
 * A fake PostgREST layer applies every `.eq`/`.in`/`.ilike` predicate against a
 * seeded two-tenant dataset, so a route that silently reverted to unscoped
 * supabaseAdmin would surface a booking row mistagged to a foreign tenant.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let limitN: number | null = null
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => {
    const all = rowsOf().filter((r) => filters.every((f) => f(r)))
    return limitN != null ? all.slice(0, limitN) : all
  }
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    ilike: (col: string, val: unknown) => {
      filters.push((r) => typeof r[col] === 'string' && (r[col] as string).toLowerCase() === String(val).toLowerCase())
      return c
    },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) >= (val as string)); return c },
    lt: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) < (val as string)); return c },
    neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return c },
    order: () => c,
    limit: (n: number) => { limitN = n; return c },
    single: async () => {
      const m = matched()
      return m[0] ? { data: m[0], error: null } : { data: null, error: { message: 'not found' } }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

const tenantCtx: { value: { id: string } } = { value: { id: TENANT_A } }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx.value }))
vi.mock('@/lib/client-auth', () => ({ protectClientAPI: async (_t: string, clientId?: string) => ({ clientId }) }))

import { GET } from './route'

beforeEach(() => {
  DB.clients = []
  DB.bookings = []
  tenantCtx.value = { id: TENANT_A }
})

describe('GET /api/client/bookings — tenantDb scoping', () => {
  it('excludes a booking row mistagged to a foreign tenant even when client_id matches', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_A, email: 'a@x.com', phone: '5551234567', do_not_service: false })
    DB.bookings.push({ id: 'bk-mine', tenant_id: TENANT_A, client_id: 'c-1', start_time: '2099-01-01' })
    DB.bookings.push({ id: 'bk-foreign', tenant_id: TENANT_B, client_id: 'c-1', start_time: '2099-01-02' })
    const res = await GET(new Request('https://x?client_id=c-1'))
    const body = await res.json() as { upcoming: Row[] }
    const ids = body.upcoming.map((b) => b.id)
    expect(ids).toContain('bk-mine')
    expect(ids).not.toContain('bk-foreign')
  })

  it('does not pull in a duplicate client row (same email) that belongs to a different tenant', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_A, email: 'shared@x.com', phone: '5551234567', do_not_service: false })
    DB.clients.push({ id: 'c-evil', tenant_id: TENANT_B, email: 'shared@x.com', phone: '5559999999', do_not_service: false })
    DB.bookings.push({ id: 'bk-evil', tenant_id: TENANT_B, client_id: 'c-evil', start_time: '2099-01-01' })
    const res = await GET(new Request('https://x?client_id=c-1'))
    const body = await res.json() as { upcoming: Row[] }
    expect(body.upcoming.map((b) => b.id)).not.toContain('bk-evil')
  })
})
