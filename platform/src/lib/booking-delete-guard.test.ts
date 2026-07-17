import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * ratings and referral_commissions carry ON DELETE CASCADE to bookings
 * (migrations 050, 019) — deleting a booking with either silently destroys
 * a real customer/team rating or a referral commission owed/paid.
 * payments and team_member_payouts have no ON DELETE action, so they'd 500
 * with a raw FK error instead. This guard must block deletion whenever any
 * of that history exists, and allow it when the booking is genuinely clean.
 */

const TENANT = 'tenant-a'
const BOOKING = 'booking-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { checkBookingDeletable } from './booking-delete-guard'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
})

describe('checkBookingDeletable', () => {
  it('allows deletion when the booking has no ratings, commissions, payments, or payouts', async () => {
    const result = await checkBookingDeletable(TENANT, BOOKING)
    expect(result.deletable).toBe(true)
  })

  it('blocks deletion when ratings has a row for this booking', async () => {
    fake._seed('ratings', [{ id: 'r-1', tenant_id: TENANT, booking_id: BOOKING, service_rating: 5 }])
    const result = await checkBookingDeletable(TENANT, BOOKING)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/rating/i)
  })

  it('blocks deletion when referral_commissions has a row for this booking', async () => {
    fake._seed('referral_commissions', [{ id: 'rc-1', tenant_id: TENANT, booking_id: BOOKING, amount_cents: 5000 }])
    const result = await checkBookingDeletable(TENANT, BOOKING)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/commission/i)
  })

  it('blocks deletion when payments has a row for this booking', async () => {
    fake._seed('payments', [{ id: 'p-1', tenant_id: TENANT, booking_id: BOOKING, amount_cents: 10000 }])
    const result = await checkBookingDeletable(TENANT, BOOKING)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/payment/i)
  })

  it('blocks deletion when team_member_payouts has a row for this booking', async () => {
    fake._seed('team_member_payouts', [{ id: 'po-1', tenant_id: TENANT, booking_id: BOOKING, amount_cents: 8000 }])
    const result = await checkBookingDeletable(TENANT, BOOKING)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/payout/i)
  })

  it("does not block on a DIFFERENT booking or tenant's history", async () => {
    fake._seed('ratings', [{ id: 'r-1', tenant_id: TENANT, booking_id: 'someone-else', service_rating: 5 }])
    fake._seed('payments', [{ id: 'p-1', tenant_id: 'other-tenant', booking_id: BOOKING, amount_cents: 10000 }])
    const result = await checkBookingDeletable(TENANT, BOOKING)
    expect(result.deletable).toBe(true)
  })
})
