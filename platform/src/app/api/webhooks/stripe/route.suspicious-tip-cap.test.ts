import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * 2026-08-01: a stale booking.price (edited after the client was quoted, or
 * a booking that never went through the 30-min-alert price-sync) produced a
 * real $97 "tip" on the adjustable-amount pay link — money actually
 * transferred to the cleaner via Stripe Connect, not just a wrong number on
 * a screen. This proves the cap: anything past a sane ceiling ($20 or 35%
 * of the expected price, whichever is bigger) is held back from the
 * cleaner's credited tip and flagged as an admin_tasks row instead of
 * silently auto-paid out.
 */

const TENANT = 'tenant-tip-1'
const BOOKING = 'booking-tip-1'
const PAY_LINK_URL = 'https://buy.stripe.com/test_tip_link'

const paymentLinksRetrieve = vi.fn(async (_id: string) => ({ url: PAY_LINK_URL }))

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: (body: string) => JSON.parse(body) }
    paymentLinks = { retrieve: (id: string) => paymentLinksRetrieve(id) }
    transfers = { create: vi.fn(async () => ({ id: 'tr_should_not_happen' })) }
    payouts = { create: vi.fn(async () => ({ id: 'po_should_not_happen' })) }
  }
  return { default: MockStripe }
})

const paymentInserts: Array<Record<string, unknown>> = []
const adminTaskInserts: Array<Record<string, unknown>> = []

function chain(table: string) {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    limit: () => c,
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: [], error: null }),
    insert: (row: Record<string, unknown>) => {
      if (table === 'payments') {
        paymentInserts.push(row)
        return { select: () => ({ single: async () => ({ data: { id: 'pay-tip-1' }, error: null }) }) }
      }
      if (table === 'admin_tasks') {
        adminTaskInserts.push(row)
        return Promise.resolve({ data: null, error: null })
      }
      return { select: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }) }
    },
    update: () => c,
    single: async () => {
      if (table === 'bookings') return bookingRow()
      if (table === 'tenants') return { data: { payment_link: PAY_LINK_URL }, error: null }
      return { data: null, error: null }
    },
    maybeSingle: async () => {
      if (table === 'bookings') return bookingRow()
      if (table === 'tenants') return { data: { payment_link: PAY_LINK_URL }, error: null }
      return { data: null, error: null }
    },
  }
  return c
}

function bookingRow() {
  return {
    data: {
      id: BOOKING,
      tenant_id: TENANT,
      client_id: 'client-tip-1',
      team_member_id: 'tm-tip-1',
      hourly_rate: 6900,
      pay_rate: 2500,
      team_member_pay: null,
      actual_hours: 2,
      price: 5300, // $53 expected — client quoted this, then it went stale
      discount_percent: null,
      one_time_credit_cents: null,
      team_size: 1,
      service_type: 'Cleaning',
      // No stripe_account_id -- skips the Connect payout branch entirely so
      // this test stays focused on the tip-cap/flagging logic, not payouts.
      team_members: { name: 'Cleaner', phone: null, pay_rate: 2500, stripe_account_id: null, preferred_language: 'en' },
      clients: { name: 'Test Client', phone: null, address: null },
      tenants: { name: 'Test Tenant', telnyx_api_key: null, telnyx_phone: null },
    },
    error: null,
  }
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false, NYCMAID_TENANT_ID: 'nycmaid-tenant' }))

import { POST } from './route'

function paidEvent(amountTotalCents: number) {
  const session = {
    id: 'cs_tip_1',
    amount_total: amountTotalCents,
    payment_intent: 'pi_tip_1',
    // No metadata.booking_id/tenant_id — forces resolution via
    // client_reference_id, the ONLY path where tipCents can be nonzero.
    metadata: {},
    client_reference_id: BOOKING,
    payment_link: 'plink_test_1',
    customer_details: { email: 'payer@example.com' },
  }
  return new Request('https://app.fullloop.example/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 'sig_test' },
    body: JSON.stringify({ type: 'checkout.session.completed', data: { object: session } }),
  })
}

beforeEach(() => {
  paymentInserts.length = 0
  adminTaskInserts.length = 0
  paymentLinksRetrieve.mockClear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy'
})

describe('POST /api/webhooks/stripe — suspicious tip cap', () => {
  it('a $97 gap over a $53 expected price caps the credited tip at $20 and flags the rest', async () => {
    const res = await POST(paidEvent(15000)) // client paid $150 vs $53 expected
    expect(res.status).toBe(200)

    expect(paymentInserts).toHaveLength(1)
    expect(paymentInserts[0].tip_cents).toBe(2000) // capped: max($20, 35% of $53) = $20

    expect(adminTaskInserts).toHaveLength(1)
    expect(adminTaskInserts[0].type).toBe('suspicious_tip')
    expect(adminTaskInserts[0].description).toContain('$77.00') // the held-back remainder
  })

  it('a plausible small tip is NOT flagged and passes through in full', async () => {
    const res = await POST(paidEvent(6300)) // client paid $63 vs $53 expected — a real $10 tip
    expect(res.status).toBe(200)

    expect(paymentInserts).toHaveLength(1)
    expect(paymentInserts[0].tip_cents).toBe(1000)

    expect(adminTaskInserts).toHaveLength(0)
  })
})
