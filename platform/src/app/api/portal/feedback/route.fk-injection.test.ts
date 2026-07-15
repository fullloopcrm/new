import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/portal/feedback -- FK-injection. booking_id is a caller-supplied
 * FK with no cross-tenant ownership check before insert, same class already
 * guarded for client_id on POST /api/reviews (commit 0e323bc3). The client
 * portal is unauthenticated by tenant (Bearer token only carries client id +
 * tenant id), so any logged-in client could plant a review pointing at a
 * foreign tenant's booking_id.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('../auth/token', () => ({
  verifyPortalToken: (token: string) =>
    token === 'valid-token' ? { id: 'client-A', tid: 'tenant-A' } : null,
}))

import { POST } from './route'

const postReq = (body: unknown, token = 'valid-token') =>
  new Request('http://x', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })

const BOOKING_A = '33333333-3333-3333-3333-333333333333'
const BOOKING_B = '44444444-4444-4444-4444-444444444444'

beforeEach(() => {
  h.seq = 0
  h.store = {
    bookings: [
      { id: BOOKING_A, tenant_id: 'tenant-A' },
      { id: BOOKING_B, tenant_id: 'tenant-B' },
    ],
    reviews: [],
  }
})

describe('POST /api/portal/feedback — FK-injection guard on booking_id', () => {
  it('creates feedback against the caller tenant’s own booking', async () => {
    const res = await POST(postReq({ rating: 5, comment: 'great', booking_id: BOOKING_A }))
    expect(res.status).toBe(201)
    expect(h.store.reviews).toHaveLength(1)
    expect(h.store.reviews[0].booking_id).toBe(BOOKING_A)
  })

  it("rejects a booking_id belonging to another tenant instead of planting a cross-tenant FK", async () => {
    const res = await POST(postReq({ rating: 1, comment: 'attack', booking_id: BOOKING_B }))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/booking/i)
    expect(h.store.reviews).toHaveLength(0)
  })

  it('allows omitting booking_id entirely', async () => {
    const res = await POST(postReq({ rating: 4 }))
    expect(res.status).toBe(201)
    expect(h.store.reviews).toHaveLength(1)
  })

  it('rejects without a valid portal token', async () => {
    const res = await POST(postReq({ rating: 5, booking_id: BOOKING_A }, 'bad-token'))
    expect(res.status).toBe(401)
  })
})
