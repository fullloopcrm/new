import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * WITNESS — cross-tenant booking_id FK injection on POST /api/booking-notes.
 *
 * booking_id was accepted from the caller and written straight into
 * booking_notes with no check that it belongs to the acting tenant.
 * booking_notes has no cross-tenant FK constraint, so a caller could attach a
 * note to ANOTHER tenant's booking id. Fixed by verifying ownership
 * (bookings row exists for booking_id AND tenant_id) before insert; 404 on miss.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ tenantId: 'tenant-A', role: 'owner' })),
  }
})

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    bookings: [
      { id: 'booking-A1', tenant_id: 'tenant-A' },
      { id: 'booking-B1', tenant_id: 'tenant-B' },
    ],
    booking_notes: [],
  }
})

describe('POST /api/booking-notes — booking_id ownership', () => {
  it("rejects a foreign tenant's booking_id, no note written", async () => {
    const res = await POST(req({ booking_id: 'booking-B1', content: 'hi', author_type: 'admin', author_name: 'A' }))
    expect(res.status).toBe(404)
    expect(h.store.booking_notes).toHaveLength(0)
  })

  it('rejects a nonexistent booking_id, no note written', async () => {
    const res = await POST(req({ booking_id: 'booking-nope', content: 'hi' }))
    expect(res.status).toBe(404)
    expect(h.store.booking_notes).toHaveLength(0)
  })

  it("accepts the acting tenant's own booking_id", async () => {
    const res = await POST(req({ booking_id: 'booking-A1', content: 'hi', author_type: 'admin', author_name: 'A' }))
    expect(res.status).toBe(200)
    expect(h.store.booking_notes).toHaveLength(1)
    expect(h.store.booking_notes[0].booking_id).toBe('booking-A1')
  })
})
