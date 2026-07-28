import { describe, it, expect, vi } from 'vitest'

/**
 * verifyOwnership() gates every method on this route -- a foreign-tenant
 * clientId must never resolve to true. No test existed for this route at
 * all before the RLS Stage 3 migration (tenantDb -> tenantClient); added
 * while migrating rather than leaving it uncovered.
 */

const A = 'tid-a'
const B = 'tid-b'

const clients = [
  { id: 'cli-a', tenant_id: A },
  { id: 'cli-b', tenant_id: B },
]

function chain() {
  const filters: Array<(r: (typeof clients)[number]) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => (r as Record<string, unknown>)[col] === val); return c },
    single: () => {
      const row = clients.find((r) => filters.every((f) => f(r)))
      return Promise.resolve({ data: row || null, error: row ? null : { message: 'not found' } })
    },
  }
  return c
}

vi.mock('@/lib/tenant-supabase', () => ({ tenantClient: async () => ({ from: () => chain() }) }))
vi.mock('@/lib/tenant-db', () => ({ tenantDb: () => ({ from: () => chain() }) }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => chain() } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A }, error: null })),
}))
vi.mock('@/lib/client-properties', () => ({
  listProperties: async () => [],
  addProperty: async () => null,
  updateProperty: async () => null,
  setPrimaryProperty: async () => {},
  deactivateProperty: async () => {},
}))

import { GET } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('clients/[id]/properties — tenant isolation', () => {
  it("GET on the acting tenant's own client succeeds", async () => {
    const res = await GET(new Request('http://t/api/clients/cli-a/properties'), params('cli-a'))
    expect(res.status).toBe(200)
  })

  it('GET on a foreign-tenant clientId is 404, not the properties list', async () => {
    const res = await GET(new Request('http://t/api/clients/cli-b/properties'), params('cli-b'))
    expect(res.status).toBe(404)
  })
})
