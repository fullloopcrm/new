import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PUT /api/reviews/:id — mass-assignment / cross-tenant regression.
 *
 * The route spread the raw request body straight into `.update(body)`. Since
 * this table (like every tenant-owned table) has its own `tenant_id` column
 * and the write goes through the service_role client (RLS bypassed), a caller
 * could include `tenant_id` in the PUT body to reassign someone else's review
 * to their own tenant, or to an arbitrary tenant id, even though the WHERE
 * clause still requires the row to currently belong to the caller's tenant.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const tenantCtx = vi.hoisted(() => ({ tenantId: 'tenant-A' }))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: tenantCtx.tenantId, role: 'owner' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { PUT } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  tenantCtx.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    reviews: [
      { id: 'rev-A1', tenant_id: 'tenant-A', rating: 5, response: null },
      { id: 'rev-B1', tenant_id: 'tenant-B', rating: 3, response: null },
    ],
  }
})

describe('PUT /api/reviews/:id', () => {
  it('updates an ordinary field on the caller tenant’s own review', async () => {
    const res = await PUT(putReq({ response: 'Thanks!' }), params('rev-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.review.response).toBe('Thanks!')
  })

  it('ignores a tenant_id in the body instead of reassigning the review to another tenant', async () => {
    const res = await PUT(putReq({ response: 'hacked', tenant_id: 'tenant-B' }), params('rev-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.review.tenant_id).toBe('tenant-A')
    expect(h.store.reviews.find((r) => r.id === 'rev-A1')?.tenant_id).toBe('tenant-A')
  })

  it("tenant A can never update tenant B's review", async () => {
    const res = await PUT(putReq({ response: 'hacked' }), params('rev-B1'))

    expect(res.status).toBe(500)
    expect(h.store.reviews.find((r) => r.id === 'rev-B1')?.response).toBeNull()
  })

  // client_id/booking_id are caller-supplied FKs with no cross-tenant check at
  // the DB layer. GET /api/reviews joins clients(name) off client_id, unscoped
  // by tenant — repointing a review's client_id would leak a foreign tenant's
  // client name on the next fetch. Now stripped by the allow-list.
  it('ignores a client_id in the body instead of repointing the review at a foreign client', async () => {
    const res = await PUT(putReq({ response: 'hi', client_id: 'foreign-client' }), params('rev-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.review.client_id).toBeUndefined()
    expect(h.store.reviews.find((r) => r.id === 'rev-A1')?.client_id).toBeUndefined()
  })

  it('ignores a booking_id in the body', async () => {
    const res = await PUT(putReq({ response: 'hi', booking_id: 'foreign-booking' }), params('rev-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.review.booking_id).toBeUndefined()
  })
})
