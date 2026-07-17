/**
 * STRIPE WEBHOOK — quote-deposit path used the WRONG fulfillment converter
 * for recurring/booking-type quotes.
 *
 * The public no-deposit accept path (route.ts sibling
 * `public/[token]/accept/route.ts`) already branches 3 ways on close:
 * recurring_type set -> createRecurringSeriesFromQuote, fulfillment_type
 * 'booking' -> createBookingFromQuote, else -> convertSaleToJob (Job board).
 * The deposit-paid webhook path (this file, `checkout.session.completed`
 * with `metadata.quote_deposit === 'true'`) always called convertSaleToJob
 * regardless of the quote's own recurring_type/fulfillment_type — so any
 * tenant requiring a deposit on a recurring or booking-type quote got a
 * one-off Job board card instead of the recurring schedule series or the
 * Booking the accept path would have created. Proves the webhook now routes
 * identically to the accept path for all three cases.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postDepositToLedger: vi.fn().mockResolvedValue(undefined),
  postRefundToLedger: vi.fn().mockResolvedValue(undefined),
  postChargebackToLedger: vi.fn().mockResolvedValue(undefined),
  tenantFromPaymentIntent: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn().mockResolvedValue(undefined) }))

let constructEventImpl: (body: string) => unknown = () => { throw new Error('no event configured') }

vi.mock('stripe', () => {
  class FakeStripe {
    webhooks = { constructEvent: (body: string) => constructEventImpl(body) }
    transfers = { create: vi.fn() }
    payouts = { create: vi.fn() }
    customers = { retrieve: vi.fn() }
  }
  return { default: FakeStripe }
})

process.env.STRIPE_SECRET_KEY = 'sk_test_x'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const CLIENT_ID = 'client-1'

function postDepositPaid(quoteId: string, sessionId: string, depositCents: number) {
  const session = {
    id: sessionId,
    amount_total: depositCents,
    metadata: { quote_deposit: 'true', quote_id: quoteId, tenant_id: TENANT_ID },
    client_reference_id: null,
    customer_details: null,
    payment_intent: `pi_${sessionId}`,
  } as unknown as Row
  constructEventImpl = () => ({ type: 'checkout.session.completed', data: { object: session } })
  return POST(new Request('https://x.test/api/webhooks/stripe', {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'stripe-signature': 'sig' },
  }))
}

function baseQuote(overrides: Row): Row {
  return {
    id: 'quote-x',
    tenant_id: TENANT_ID,
    status: 'accepted',
    deal_id: null,
    deposit_paid_at: null,
    deposit_paid_cents: null,
    deposit_session_id: null,
    deposit_cents: 5_000,
    quote_number: 'Q-1',
    total_cents: 20_000,
    client_id: CLIENT_ID,
    contact_email: null,
    title: 'Service Quote',
    notes: null,
    converted_at: null,
    converted_booking_id: null,
    converted_schedule_id: null,
    recurring_type: null,
    recurring_start_date: null,
    recurring_preferred_time: null,
    recurring_duration_hours: null,
    fulfillment_type: null,
    ...overrides,
  }
}

beforeEach(() => {
  fake._store.clear()
  fake._addUniqueConstraint('payments', 'stripe_session_id')
  fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Client' }])
})

describe('quote-deposit path routes fulfillment the same way the accept path does', () => {
  it('recurring_type set -> creates a recurring_schedules series, NOT a Job', async () => {
    fake._seed('quotes', [baseQuote({ id: 'quote-recurring', recurring_type: 'weekly' })])

    const res = await postDepositPaid('quote-recurring', 'cs_recurring', 5_000)
    const body = await res.json()

    expect(body.quote_deposit_paid).toBe(true)
    expect(fake._all('recurring_schedules').length).toBe(1)
    expect(fake._all('recurring_schedules')[0].client_id).toBe(CLIENT_ID)
    expect(fake._all('jobs').length).toBe(0)
    expect(fake._all('bookings').length).toBeGreaterThan(0) // series generates its initial visits

    const updatedQuote = fake._all('quotes').find((q) => q.id === 'quote-recurring')
    expect(updatedQuote?.status).toBe('converted')
    expect(updatedQuote?.converted_schedule_id).toBeTruthy()
  })

  it("fulfillment_type 'booking' -> creates a single Booking, NOT a Job", async () => {
    fake._seed('quotes', [baseQuote({ id: 'quote-booking', fulfillment_type: 'booking' })])

    const res = await postDepositPaid('quote-booking', 'cs_booking', 5_000)
    const body = await res.json()

    expect(body.quote_deposit_paid).toBe(true)
    expect(fake._all('bookings').length).toBe(1)
    expect(fake._all('jobs').length).toBe(0)

    const updatedQuote = fake._all('quotes').find((q) => q.id === 'quote-booking')
    expect(updatedQuote?.status).toBe('converted')
    expect(updatedQuote?.converted_booking_id).toBeTruthy()
  })

  it('neither recurring_type nor booking fulfillment -> falls through to the Job board (unchanged default)', async () => {
    fake._seed('quotes', [baseQuote({ id: 'quote-project' })])

    const res = await postDepositPaid('quote-project', 'cs_project', 5_000)
    const body = await res.json()

    expect(body.quote_deposit_paid).toBe(true)
    expect(fake._all('jobs').length).toBe(1)
    expect(fake._all('recurring_schedules').length).toBe(0)
    expect(fake._all('bookings').length).toBe(0)
  })
})
