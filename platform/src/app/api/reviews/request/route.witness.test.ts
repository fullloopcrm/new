import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * reviews/request POST — booking_id FK-injection guard.
 *
 * BUG (fixed here): client_id was already verified tenant-owned before
 * insert, but booking_id was a caller-supplied field inserted verbatim into
 * reviews.booking_id with no ownership check at all — an operator of tenant
 * A could attach a booking_id belonging to tenant B (or another client of A)
 * to an internal review-request record. No current read joins bookings(...)
 * off reviews, so this is a dangling-reference bug rather than live exfil —
 * same lower-severity shape as the already-fixed client-portal twin of this
 * route (register P15, src/app/api/portal/feedback/route.ts), which this
 * admin-side route had NOT been given the same guard for.
 *
 * FIX: booking_id, when supplied, is now verified owned (tenant_id=caller
 * AND client_id=the review's client_id) before insert; a miss 404s instead
 * of silently writing a dangling/foreign reference.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'
const CLIENT_A = '11111111-1111-1111-1111-111111111111'
const OTHER_CLIENT = '22222222-2222-2222-2222-222222222222'

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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT, name: 'Acme', google_place_id: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null },
      role: 'owner',
    })),
  }
})

vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ sent: true })) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ sent: true })) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    clients: [
      { id: CLIENT_A, tenant_id: CTX_TENANT, name: 'Mine Client', email: null, phone: null },
    ],
    bookings: [
      { id: 'bk-own', tenant_id: CTX_TENANT, client_id: CLIENT_A },
      { id: 'bk-other-client', tenant_id: CTX_TENANT, client_id: OTHER_CLIENT },
      { id: 'bk-other-tenant', tenant_id: OTHER_TENANT, client_id: CLIENT_A },
    ],
    reviews: [] as Array<Record<string, unknown>>,
  }
}

function req(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('reviews/request POST — booking_id ownership guard', () => {
  it("rejects a booking_id belonging to a different tenant (404, no insert)", async () => {
    const res = await POST(req({ client_id: CLIENT_A, booking_id: 'bk-other-tenant' }))
    expect(res.status).toBe(404)
    const insert = h.capture.inserts.find((i) => i.table === 'reviews')
    expect(insert).toBeUndefined()
  })

  it('rejects a booking_id belonging to another client in the SAME tenant (404, no insert)', async () => {
    const res = await POST(req({ client_id: CLIENT_A, booking_id: 'bk-other-client' }))
    expect(res.status).toBe(404)
    const insert = h.capture.inserts.find((i) => i.table === 'reviews')
    expect(insert).toBeUndefined()
  })

  it("CONTROL: keeps a booking_id that really is the caller's own client's booking", async () => {
    const res = await POST(req({ client_id: CLIENT_A, booking_id: 'bk-own' }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'reviews')
    expect(insert!.rows[0].booking_id).toBe('bk-own')
  })

  it('CONTROL: omitting booking_id still creates the review request with a null booking_id', async () => {
    const res = await POST(req({ client_id: CLIENT_A }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'reviews')
    expect(insert!.rows[0].booking_id).toBeNull()
  })
})
