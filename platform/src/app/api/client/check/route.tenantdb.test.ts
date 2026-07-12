import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET/POST /api/client/check.
 * A fake PostgREST layer applies every `.eq`/`.ilike` predicate against a
 * seeded two-tenant dataset, so a route that silently reverted to unscoped
 * supabaseAdmin would report a match (and leak name/phone) for a client that
 * belongs to a different tenant but shares an email/phone.
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
    ilike: (col: string, val: unknown) => {
      filters.push((r) => typeof r[col] === 'string' && (r[col] as string).toLowerCase() === String(val).toLowerCase())
      return c
    },
    maybeSingle: async () => ({ data: matched()[0] || null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

const tenantCtx: { value: { id: string } } = { value: { id: TENANT_A } }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx.value }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))

import { GET } from './route'

beforeEach(() => {
  DB.clients = []
  tenantCtx.value = { id: TENANT_A }
})

describe('GET /api/client/check — tenantDb scoping', () => {
  it('does not report a match for an email owned by a different tenant', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_B, email: 'shared@x.com', phone: '5551234567', name: 'Evil Twin' })
    const res = await GET(new Request('https://x?email=shared@x.com'))
    expect(await res.json()).toMatchObject({ exists: false })
  })

  it('reports a match for an email within the caller tenant', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_A, email: 'shared@x.com', phone: '5551234567', name: 'Real Client' })
    const res = await GET(new Request('https://x?email=shared@x.com'))
    expect(await res.json()).toMatchObject({ exists: true, name: 'Real Client' })
  })
})
