import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Stripe webhook — money-branch state transitions + tenant scope.
 *
 * Complements the two existing webhook tests (invoice happy-path/idempotency in
 * route.test.ts; booking-payout dedupe in route.payout-idempotency.test.ts). The
 * gaps this file closes — all live money:
 *   • quote deposit pay  → deposit stamped + deal advanced to `sold` (NEW)
 *   • booking pay        → payment recorded + booking.payment_status → `paid` (NEW;
 *                          the existing booking test only exercises the dup case)
 *   • wrong-tenant probes on the deposit + booking branches (MY LANE): the route
 *     is NOT tenantDb-converted — it trusts `tenant_id` from Stripe metadata and
 *     scopes every write with `.eq('tenant_id', tenantId)`. An event whose
 *     metadata.tenant_id does not own the referenced row must NOT cross-write.
 *
 * Stripe is mocked so `constructEvent` echoes the request body as the event;
 * supabaseAdmin is the in-memory tenant harness (it actually applies `.eq`).
 */

process.env.STRIPE_SECRET_KEY = 'sk_test_x'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: (body: string) => JSON.parse(body) }
    transfers = { create: async () => ({ id: 'tr_1' }) }
    payouts = { create: async () => ({ id: 'po_1' }) }
    customers = { retrieve: async () => ({ deleted: false, email: null }) }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

// Side-effecting collaborators stubbed so the module stays hermetic; the state
// transitions under test all happen through supabaseAdmin (the harness).
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
// Dynamic imports fired on the deposit path.
vi.mock('@/lib/jobs', () => ({ convertSaleToJob: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    payments: [] as Record<string, any>[],
    quotes: [
      { id: 'q-a', tenant_id: A, deal_id: 'd-a', quote_number: 'Q-1', deposit_cents: 20000, deposit_paid_cents: 0, deposit_paid_at: null },
    ],
    deals: [{ id: 'd-a', tenant_id: A, stage: 'quoted', probability: 40 }],
    deal_activities: [] as Record<string, any>[],
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
  data: { object: { id: 'cs_x', amount_total: 0, ...session } },
})

describe('webhooks/stripe — quote deposit pay', () => {
  it('positive control: stamps the deposit and advances the deal to sold', async () => {
    const res = await fire(
      checkoutCompleted({ id: 'cs_dep', amount_total: 20000, metadata: { quote_deposit: 'true', quote_id: 'q-a', tenant_id: A } }),
    )
    expect(await res.json()).toEqual({ received: true, quote_deposit_paid: true })
    expect(h.seed.quotes.find((q) => q.id === 'q-a')!.deposit_paid_at).not.toBeNull()
    expect(h.seed.deals.find((d) => d.id === 'd-a')!.stage).toBe('sold')
  })

  it("wrong-tenant probe: B's event on A's quote never writes to A", async () => {
    const res = await fire(
      checkoutCompleted({ id: 'cs_dep', amount_total: 20000, metadata: { quote_deposit: 'true', quote_id: 'q-a', tenant_id: B } }),
    )
    expect(await res.json()).toEqual({ received: true, quote_not_found: true })
    expect(h.seed.quotes.find((q) => q.id === 'q-a')!.deposit_paid_at).toBeNull()
    expect(h.seed.deals.find((d) => d.id === 'd-a')!.stage).toBe('quoted')
    expect(h.capture.updates).toHaveLength(0)
  })
})

describe('webhooks/stripe — booking pay', () => {
  it('positive control: records the payment and marks the booking paid', async () => {
    const res = await fire(
      checkoutCompleted({ id: 'cs_bk', amount_total: 10000, payment_intent: 'pi_bk', metadata: { booking_id: 'bk-a', tenant_id: A } }),
    )
    expect(await res.json()).toEqual({ received: true })
    const pay = h.seed.payments.find((p) => p.stripe_session_id === 'cs_bk')
    expect(pay).toMatchObject({ tenant_id: A, booking_id: 'bk-a', amount_cents: 10000, status: 'completed' })
    expect(h.seed.bookings.find((b) => b.id === 'bk-a')!.payment_status).toBe('paid')
  })

  it("wrong-tenant probe: B's event on A's booking records nothing", async () => {
    const res = await fire(
      checkoutCompleted({ id: 'cs_bk', amount_total: 10000, metadata: { booking_id: 'bk-a', tenant_id: B } }),
    )
    expect(await res.json()).toEqual({ received: true })
    expect(h.seed.payments.filter((p) => p.stripe_session_id === 'cs_bk')).toHaveLength(0)
    expect(h.seed.bookings.find((b) => b.id === 'bk-a')!.payment_status).toBe('unpaid')
  })
})
