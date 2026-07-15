import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Stripe webhook — `client_reference_id` payment-link hijack.
 *
 * `client_reference_id` is a caller-editable URL query param on a Stripe
 * Payment Link (`?client_reference_id=<bookingId>`) — Stripe never validates
 * or restricts its value. Before the fix, the webhook resolved `tenantId`
 * straight off whichever booking that id happened to match, with no check
 * that the Payment Link actually used for the checkout belongs to that
 * booking's tenant. Anyone holding ANY tenant's static `payment_link` URL
 * (sent to clients via the 15-min-alert / payment-followup-daily SMS) could
 * pay through it with a foreign tenant's `bookingId` appended, crediting that
 * payment — and triggering a real Stripe Connect payout — to a booking they
 * never paid for.
 *
 * Fix: before trusting the `client_reference_id` resolution, verify Stripe's
 * own record of the Payment Link used (`session.payment_link`, retrieved live)
 * has the same `.url` as the referenced booking's tenant's stored
 * `payment_link`. A mismatch (or an unverifiable link) is treated the same as
 * "no client_reference_id at all" — falls through to the existing NYC Maid
 * email-match / admin-alert path instead of silently crediting a foreign
 * booking.
 */

process.env.STRIPE_SECRET_KEY = 'sk_test_x'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

// Maps a fake Payment Link id -> the URL Stripe says it resolves to, so a
// test can simulate "the link the payer actually used" independent of
// whatever bookingId they appended as client_reference_id.
const linkUrls = vi.hoisted(() => ({ map: new Map<string, string>() }))

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: (body: string) => JSON.parse(body) }
    transfers = { create: async () => ({ id: 'tr_1' }) }
    payouts = { create: async () => ({ id: 'po_1' }) }
    customers = { retrieve: async () => ({ deleted: false, email: null }) }
    paymentLinks = {
      retrieve: async (id: string) => {
        const url = linkUrls.map.get(id)
        if (!url) throw new Error('no such payment link')
        return { id, url }
      },
    }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false, NYCMAID_TENANT_ID: 'nycmaid' }))
vi.mock('@/lib/billing-hours', () => ({ cleanerPaidHours: (m: number) => m / 60 }))
vi.mock('@/lib/cleaner-pay', () => ({ effectiveCleanerRate: (r: number) => r }))
vi.mock('@/lib/tier-prices', () => ({ signupPricing: () => ({ monthly_cents: 0, setup_cents: 0, admins: 1, teamMembers: 0 }) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(async () => {}) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(async () => {}) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postDepositToLedger: vi.fn(async () => {}),
  postRefundToLedger: vi.fn(async () => {}),
  postChargebackToLedger: vi.fn(async () => {}),
  tenantFromPaymentIntent: vi.fn(async () => null),
}))
vi.mock('@/lib/jobs', () => ({ convertSaleToJob: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    payments: [] as Record<string, any>[],
    tenants: [
      { id: A, payment_link: 'https://buy.stripe.com/tenant-a-link' },
      { id: B, payment_link: 'https://buy.stripe.com/tenant-b-link' },
    ],
    bookings: [
      { id: 'bk-a', tenant_id: A, client_id: 'c-a', team_member_id: null, price: 10000, hourly_rate: 50, actual_hours: 2, payment_status: 'unpaid' },
    ],
    notifications: [] as Record<string, any>[],
    admin_tasks: [] as Record<string, any>[],
    team_member_payouts: [] as Record<string, any>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  linkUrls.map.clear()
})

function fire(event: unknown) {
  return POST(
    new Request('http://t/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: JSON.stringify(event),
    }),
  )
}

const checkoutCompleted = (session: Record<string, unknown>) => ({
  type: 'checkout.session.completed',
  data: { object: { id: 'cs_x', amount_total: 10000, ...session } },
})

describe('webhooks/stripe — client_reference_id payment-link hijack', () => {
  it("LOCK: a foreign tenant's payment link paying through it with tenant A's bookingId appended does NOT credit A's booking", async () => {
    // Attacker holds tenant B's real static payment_link and pays through it,
    // appending tenant A's booking id as client_reference_id.
    linkUrls.map.set('plink_b', 'https://buy.stripe.com/tenant-b-link')
    const res = await fire(
      checkoutCompleted({ id: 'cs_hijack', client_reference_id: 'bk-a', payment_link: 'plink_b' }),
    )
    await res.json()
    expect(h.seed.payments.filter((p) => p.stripe_session_id === 'cs_hijack')).toHaveLength(0)
    expect(h.seed.bookings.find((b) => b.id === 'bk-a')!.payment_status).toBe('unpaid')
    expect(h.seed.team_member_payouts).toHaveLength(0)
  })

  it('LOCK: an unresolvable/missing payment_link on the session also does not credit the booking', async () => {
    const res = await fire(
      checkoutCompleted({ id: 'cs_no_link', client_reference_id: 'bk-a', payment_link: null }),
    )
    await res.json()
    expect(h.seed.payments.filter((p) => p.stripe_session_id === 'cs_no_link')).toHaveLength(0)
    expect(h.seed.bookings.find((b) => b.id === 'bk-a')!.payment_status).toBe('unpaid')
  })

  it("CONTROL: tenant A's own payment link with A's bookingId appended still credits the booking", async () => {
    linkUrls.map.set('plink_a', 'https://buy.stripe.com/tenant-a-link')
    const res = await fire(
      checkoutCompleted({ id: 'cs_legit', client_reference_id: 'bk-a', payment_link: 'plink_a' }),
    )
    expect(await res.json()).toEqual({ received: true })
    const pay = h.seed.payments.find((p) => p.stripe_session_id === 'cs_legit')
    expect(pay).toMatchObject({ tenant_id: A, booking_id: 'bk-a', amount_cents: 10000 })
    expect(h.seed.bookings.find((b) => b.id === 'bk-a')!.payment_status).toBe('paid')
  })
})
