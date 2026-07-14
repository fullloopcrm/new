import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant booking_id FK injection on POST /api/booking-notes.
 *
 * booking_id was accepted from the caller and written straight into
 * booking_notes with no check that it belongs to the acting tenant.
 * booking_notes has no cross-tenant FK constraint, so a caller could attach a
 * note to ANOTHER tenant's booking id. Fixed by verifying ownership
 * (bookings row exists for booking_id AND tenant_id) before insert; 404 on miss.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: TENANT_A, tenant: { id: TENANT_A }, role: 'owner' })),
  }
})

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'booking-a1', tenant_id: TENANT_A },
      { id: 'booking-b1', tenant_id: TENANT_B },
    ],
    booking_notes: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function req(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as Request
}

describe('POST /api/booking-notes — booking_id ownership', () => {
  it("WRONG-TENANT PROBE: a foreign tenant's booking_id is rejected, no note written", async () => {
    const res = await POST(req({ booking_id: 'booking-b1', content: 'hi', author_type: 'admin', author_name: 'A' }))
    expect(res.status).toBe(404)
    expect(h.seed.booking_notes).toHaveLength(0)
  })

  it('a nonexistent booking_id is rejected, no note written', async () => {
    const res = await POST(req({ booking_id: 'booking-nope', content: 'hi' }))
    expect(res.status).toBe(404)
    expect(h.seed.booking_notes).toHaveLength(0)
  })

  it("positive control: the acting tenant's own booking_id succeeds", async () => {
    const res = await POST(req({ booking_id: 'booking-a1', content: 'hi', author_type: 'admin', author_name: 'A' }))
    expect(res.status).toBe(200)
    expect(h.seed.booking_notes).toHaveLength(1)
    expect(h.seed.booking_notes[0].booking_id).toBe('booking-a1')
  })
})
