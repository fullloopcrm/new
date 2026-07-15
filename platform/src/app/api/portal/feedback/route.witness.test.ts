import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * portal/feedback POST — booking_id FK-injection guard.
 *
 * BUG (fixed here): booking_id was a caller-supplied field inserted verbatim
 * into reviews.booking_id with no ownership check — a client of tenant A
 * could attach a booking_id belonging to tenant B (or another client of A)
 * to their review. No current read joins bookings(...) off reviews, so this
 * was a dangling-reference bug rather than live exfil, but the same shape as
 * the P1-P14 FK-injection class this lane has been closing elsewhere.
 *
 * FIX: booking_id is now verified owned (tenant_id=auth.tid AND
 * client_id=auth.id) before insert; a foreign/unowned id is silently dropped
 * (null) rather than rejecting the whole feedback submission.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'
const CTX_CLIENT = 'client-a'
const OTHER_CLIENT = 'client-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('../auth/token', () => ({
  verifyPortalToken: vi.fn(() => ({ id: CTX_CLIENT, tid: CTX_TENANT })),
}))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-own', tenant_id: CTX_TENANT, client_id: CTX_CLIENT },
      { id: 'bk-other-client', tenant_id: CTX_TENANT, client_id: OTHER_CLIENT },
      { id: 'bk-other-tenant', tenant_id: OTHER_TENANT, client_id: CTX_CLIENT },
    ],
    reviews: [] as Array<Record<string, unknown>>,
  }
}

function req(body: unknown): Request {
  return new Request('http://x/api/portal/feedback', {
    method: 'POST',
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('portal/feedback POST — booking_id ownership guard', () => {
  it('drops a booking_id belonging to a different tenant', async () => {
    const res = await POST(req({ rating: 5, comment: 'great', booking_id: 'bk-other-tenant' }))
    expect(res.status).toBe(201)
    const insert = h.capture.inserts.find((i) => i.table === 'reviews')
    expect(insert!.rows[0].booking_id).toBeNull()
  })

  it("drops a booking_id belonging to another client in the SAME tenant", async () => {
    const res = await POST(req({ rating: 5, comment: 'great', booking_id: 'bk-other-client' }))
    expect(res.status).toBe(201)
    const insert = h.capture.inserts.find((i) => i.table === 'reviews')
    expect(insert!.rows[0].booking_id).toBeNull()
  })

  it('CONTROL: keeps a booking_id that really is the caller\'s own', async () => {
    const res = await POST(req({ rating: 5, comment: 'great', booking_id: 'bk-own' }))
    expect(res.status).toBe(201)
    const insert = h.capture.inserts.find((i) => i.table === 'reviews')
    expect(insert!.rows[0].booking_id).toBe('bk-own')
  })

  it('CONTROL: omitting booking_id still creates the review with a null booking_id', async () => {
    const res = await POST(req({ rating: 4 }))
    expect(res.status).toBe(201)
    const insert = h.capture.inserts.find((i) => i.table === 'reviews')
    expect(insert!.rows[0].booking_id).toBeNull()
  })
})
