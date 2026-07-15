import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/reviews/request -- FK-injection. booking_id is a caller-supplied
 * FK with no cross-tenant ownership check before insert, same class already
 * guarded for client_id in this same handler (and for client_id on sibling
 * POST /api/reviews, commit 0e323bc3). A caller could plant a review-request
 * row pointing at a foreign tenant's booking_id.
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
  requirePermission: async () => ({
    tenant: { tenantId: tenantCtx.tenantId, tenant: { google_place_id: null, name: 'Tenant A', resend_api_key: null, telnyx_api_key: null, telnyx_phone: null } },
    error: null,
  }),
}))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn() }))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

const CLIENT_A = '11111111-1111-1111-1111-111111111111'
const BOOKING_A = '33333333-3333-3333-3333-333333333333'
const BOOKING_B = '44444444-4444-4444-4444-444444444444'

beforeEach(() => {
  tenantCtx.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    clients: [{ id: CLIENT_A, tenant_id: 'tenant-A', name: 'Alice', email: null, phone: null }],
    bookings: [
      { id: BOOKING_A, tenant_id: 'tenant-A' },
      { id: BOOKING_B, tenant_id: 'tenant-B' },
    ],
    reviews: [],
  }
})

describe('POST /api/reviews/request — FK-injection guard on booking_id', () => {
  it('creates a review request against the caller tenant’s own booking', async () => {
    const res = await POST(postReq({ client_id: CLIENT_A, booking_id: BOOKING_A }))
    expect(res.status).toBe(200)
    expect(h.store.reviews).toHaveLength(1)
    expect(h.store.reviews[0].booking_id).toBe(BOOKING_A)
  })

  it("rejects a booking_id belonging to another tenant instead of planting a cross-tenant FK", async () => {
    const res = await POST(postReq({ client_id: CLIENT_A, booking_id: BOOKING_B }))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/booking/i)
    expect(h.store.reviews).toHaveLength(0)
  })

  it('allows omitting booking_id entirely', async () => {
    const res = await POST(postReq({ client_id: CLIENT_A }))
    expect(res.status).toBe(200)
    expect(h.store.reviews).toHaveLength(1)
  })
})
