import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/attribution/manual.
 *
 * booking_id is a caller-supplied FK. Before the fix, the update alone was
 * tenant-scoped but silently no-op'd (no error) on a foreign id, and a
 * separate select (also scoped, but with its error ignored) meant a foreign
 * booking_id still fell through to a false `{success:true}` AND inserted a
 * `notifications` row carrying that foreign booking_id — a cross-tenant FK
 * reference planted on the notifications table. Fixed by chaining
 * .select().single() on the update itself so a foreign booking_id 404s
 * before anything is written.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

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
    getTenantForRequest: vi.fn(async () => ({ tenantId: CTX_TENANT })),
  }
})

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'booking-a', tenant_id: CTX_TENANT, clients: { name: 'Mine Client' } },
      { id: 'booking-b', tenant_id: OTHER_TENANT, clients: { name: 'Theirs Client' } },
    ],
    notifications: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('attribution/manual POST — tenant isolation', () => {
  it("WRONG-TENANT PROBE: a foreign tenant's booking_id 404s, no update, no notification planted", async () => {
    const req = { json: async () => ({ booking_id: 'booking-b', domain: 'example.com' }) } as unknown as Request
    const res = await POST(req)
    expect(res.status).toBe(404)

    const foreignBooking = h.seed.bookings.find((b) => b.id === 'booking-b')
    expect(foreignBooking!.attributed_domain).toBeUndefined()

    const notifInsert = h.capture.inserts.find((i) => i.table === 'notifications')
    expect(notifInsert).toBeUndefined()
  })

  it("the acting tenant's own booking_id succeeds and plants exactly that booking_id on the notification", async () => {
    const req = { json: async () => ({ booking_id: 'booking-a', domain: 'example.com' }) } as unknown as Request
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const ownBooking = h.seed.bookings.find((b) => b.id === 'booking-a')
    expect(ownBooking!.attributed_domain).toBe('example.com')

    const notifInsert = h.capture.inserts.find((i) => i.table === 'notifications')
    expect(notifInsert!.rows[0].booking_id).toBe('booking-a')
    expect(notifInsert!.rows[0].message).toContain('Mine Client')
  })
})
