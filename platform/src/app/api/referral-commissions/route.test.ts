/**
 * POST/PUT /api/referral-commissions — money-race regression (P1/W1).
 *
 * POST check-then-inserted a referral_commissions row keyed by booking_id
 * with no DB backstop: two concurrent creates for the same booking (a
 * double-clicked "create commission" button, or a retried request) both
 * pass the SELECT-then-INSERT `existing` check before either INSERT
 * commits, producing a duplicate row and double-counting the referrer's
 * total_earned. See migration 066_unique_referral_commissions_booking.sql.
 *
 * PUT (mark paid) had no idempotency guard at all: calling it twice for the
 * same already-paid commission (double-click on "Pay", a network retry)
 * re-added commission_cents to referrer.total_paid every time, even
 * sequentially with no concurrency involved.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))
const t = vi.hoisted(() => ({ tenantId: 'tenant-A' }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: () => Promise.resolve({ tenantId: t.tenantId }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postCommissionAccrual: vi.fn(() => Promise.resolve({ posted: true })),
  postCommissionPayment: vi.fn(() => Promise.resolve({ posted: true })),
}))

import { POST, PUT } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  t.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    bookings: [
      { id: 'booking-1', tenant_id: 'tenant-A', price: 10000, referrer_id: 'referrer-1', clients: { name: 'Jane' } },
    ],
    referrers: [
      { id: 'referrer-1', tenant_id: 'tenant-A', name: 'Ref Co', email: null, commission_rate: 0.10, total_earned: 0, total_paid: 0 },
    ],
    referral_commissions: [],
  }
})

describe('POST /api/referral-commissions', () => {
  it('creates a commission for a booking with a referrer', async () => {
    const res = await POST(postReq({ booking_id: 'booking-1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.commission.commission_cents).toBe(1000)
    expect(h.store.referral_commissions).toHaveLength(1)
    expect(h.store.referrers[0].total_earned).toBe(1000)
  })

  it('a retried create for the same booking never double-counts total_earned', async () => {
    // Two genuinely concurrent requests (both racing the SELECT-then-INSERT
    // `existing` check before either INSERT commits) can't be reproduced with
    // sequential in-process awaits against this fake -- but the end-to-end
    // guarantee that matters is the same either way: a second create attempt
    // for a booking that already has a commission, whether caught by the
    // `existing` check (this test) or by the INSERT's 23505 handling (the
    // real race), must never leave a duplicate row or double the referrer's
    // total_earned. The 23505 branch in route.ts is what makes that true
    // even when `existing` itself races and misses.
    const first = await POST(postReq({ booking_id: 'booking-1' }))
    expect(first.status).toBe(200)
    expect(h.store.referrers[0].total_earned).toBe(1000)

    const second = await POST(postReq({ booking_id: 'booking-1' }))
    const json = await second.json()

    expect(second.status).toBe(409)
    expect(json.error).toMatch(/already exists/i)
    expect(h.store.referral_commissions).toHaveLength(1)
    // The critical assertion: a duplicate create attempt must never double
    // the referrer's total_earned.
    expect(h.store.referrers[0].total_earned).toBe(1000)
  })
})

describe('PUT /api/referral-commissions (mark paid)', () => {
  beforeEach(() => {
    h.store.referral_commissions = [
      { id: 'comm-1', tenant_id: 'tenant-A', referrer_id: 'referrer-1', commission_cents: 1000, status: 'pending' },
    ]
  })

  it('marks a pending commission paid and bumps referrer.total_paid once', async () => {
    const res = await PUT(putReq({ id: 'comm-1', status: 'paid' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('paid')
    expect(h.store.referrers[0].total_paid).toBe(1000)
  })

  it('a second mark-paid call on an already-paid commission is an idempotent no-op', async () => {
    const first = await PUT(putReq({ id: 'comm-1', status: 'paid' }))
    expect(first.status).toBe(200)
    expect(h.store.referrers[0].total_paid).toBe(1000)

    const second = await PUT(putReq({ id: 'comm-1', status: 'paid' }))
    const json = await second.json()

    expect(second.status).toBe(200)
    expect(json.status).toBe('paid')
    // The bug: without the `.neq('status','paid')` guard, this second call
    // re-adds commission_cents and total_paid becomes 2000.
    expect(h.store.referrers[0].total_paid).toBe(1000)
  })

  it("tenant A can never mark tenant B's commission paid", async () => {
    h.store.referral_commissions.push({ id: 'comm-B1', tenant_id: 'tenant-B', referrer_id: 'referrer-1', commission_cents: 500, status: 'pending' })

    const res = await PUT(putReq({ id: 'comm-B1', status: 'paid' }))

    expect(res.status).toBe(404)
    expect(h.store.referral_commissions.find((c) => c.id === 'comm-B1')?.status).toBe('pending')
  })
})
