import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/reviews -- FK-injection. client_id is a caller-supplied FK with
 * no cross-tenant ownership check before insert, while GET /api/reviews joins
 * clients(name) off client_id unscoped by tenant. A caller could plant a
 * review row pointing at a foreign tenant's client_id, then leak that
 * client's name back out on the next GET (same class as the already-guarded
 * PUT /api/reviews/[id] allow-list).
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
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: tenantCtx.tenantId }, error: null }),
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  tenantCtx.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    clients: [
      { id: '11111111-1111-1111-1111-111111111111', tenant_id: 'tenant-A', name: 'Alice (tenant A)' },
      { id: '22222222-2222-2222-2222-222222222222', tenant_id: 'tenant-B', name: 'Bob (tenant B, victim)' },
    ],
    reviews: [],
  }
})

const CLIENT_A = '11111111-1111-1111-1111-111111111111'
const CLIENT_B = '22222222-2222-2222-2222-222222222222'

describe('POST /api/reviews — FK-injection guard on client_id', () => {
  it('creates a review for the caller tenant’s own client', async () => {
    const res = await POST(postReq({ client_id: CLIENT_A, rating: 5 }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.review.client_id).toBe(CLIENT_A)
  })

  it("rejects a client_id belonging to another tenant instead of planting a cross-tenant FK", async () => {
    const res = await POST(postReq({ client_id: CLIENT_B, rating: 1, comment: 'attack' }))

    expect(res.status).toBe(404)
    expect(h.store.reviews).toHaveLength(0)
  })

  it('allows omitting client_id entirely', async () => {
    const res = await POST(postReq({ rating: 4 }))
    expect(res.status).toBe(201)
  })
})
