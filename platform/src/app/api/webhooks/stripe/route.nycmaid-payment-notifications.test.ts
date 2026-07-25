import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * NYC Maid parity regression (2026-07-25): the independent nycmaid build
 * posted "Stripe payment CONFIRMED ... Client + cleaner notified" to Jeff's
 * Telegram owner channel via notify() (src/lib/notify.ts) on every
 * checkout.session.completed, and told the cleaner via SMS to finish up and
 * check out. Neither survived the rewrite into this shared Full Loop
 * webhook — only the in-app row and the admin SMS did. This locks both back
 * in, scoped to NYC Maid only (other tenants have no telegram_bot_token /
 * telegram_chat_id and must not fall back to Jeff's personal platform bot).
 */

const TENANT = 'nycmaid-tenant'
const BOOKING = 'booking-nm-1'

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: (body: string) => JSON.parse(body) }
  }
  return { default: MockStripe }
})

function chain(table: string) {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    limit: () => c,
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: [], error: null }),
    insert: (row: Record<string, unknown>) => {
      if (table === 'payments') {
        return { select: () => ({ single: async () => ({ data: { id: 'pay-1' }, error: null }) }) }
      }
      return { select: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }) }
    },
    update: () => c,
    single: async () => {
      if (table === 'bookings') {
        return {
          data: {
            id: BOOKING,
            client_id: 'client-1',
            team_member_id: 'tm-1',
            hourly_rate: 69,
            pay_rate: 25,
            team_member_pay: null,
            actual_hours: 2,
            price: null,
            // No stripe_account_id -- skips the Connect payout branch entirely
            // so this test stays focused on the notification paths.
            team_members: { name: 'Cleaner', phone: '+15551230000', pay_rate: 25, stripe_account_id: null, preferred_language: 'en' },
            clients: { name: 'Test Client', phone: '+15559990000', address: '123 Main St' },
            tenants: { name: 'The NYC Maid', telnyx_api_key: 'key_test', telnyx_phone: '+18883164019' },
          },
          error: null,
        }
      }
      return { data: null, error: null }
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(async () => ({ posted: true })) }))

const sendSMS = vi.fn(async (arg: { to: string; body: string }) => {})
vi.mock('@/lib/sms', () => ({ sendSMS: (arg: { to: string; body: string }) => sendSMS(arg) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))

const nycmaidNotify = vi.fn(async (arg: { type: string; tenantId?: string; message: string; booking_id?: string }) => {})
vi.mock('@/lib/nycmaid/notify', () => ({ notify: (arg: { type: string; tenantId?: string; message: string; booking_id?: string }) => nycmaidNotify(arg) }))

let nycMaidFlag = true
vi.mock('@/lib/nycmaid/tenant', () => ({
  isNycMaid: () => nycMaidFlag,
  NYCMAID_TENANT_ID: 'nycmaid-tenant',
}))

import { POST } from './route'

function paidEvent() {
  const session = {
    id: 'cs_nm_1',
    amount_total: 13800,
    payment_intent: 'pi_nm_1',
    client_reference_id: null,
    customer_details: {},
    metadata: { booking_id: BOOKING, tenant_id: TENANT },
  }
  return new Request('https://app.fullloop.example/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 'sig_test' },
    body: JSON.stringify({ type: 'checkout.session.completed', data: { object: session } }),
  })
}

beforeEach(() => {
  sendSMS.mockClear()
  nycmaidNotify.mockClear()
  nycMaidFlag = true
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy'
})

describe('POST /api/webhooks/stripe — NYC Maid payment notifications', () => {
  it('posts the Telegram payment_received notify() and tells the cleaner to check out', async () => {
    const res = await POST(paidEvent())
    expect(res.status).toBe(200)

    expect(nycmaidNotify).toHaveBeenCalledTimes(1)
    const notifyArg = nycmaidNotify.mock.calls[0][0]
    expect(notifyArg.type).toBe('payment_received')
    expect(notifyArg.tenantId).toBe(TENANT)
    expect(notifyArg.booking_id).toBe(BOOKING)
    expect(notifyArg.message).toMatch(/Client \+ cleaner notified/)

    const cleanerCall = sendSMS.mock.calls.find(args => args[0].to === '+15551230000')
    expect(cleanerCall).toBeTruthy()
    expect(cleanerCall?.[0].body).toMatch(/check out/i)
  })

  it('does not post to Telegram or add the checkout line for a non-NYC-Maid tenant', async () => {
    nycMaidFlag = false
    const res = await POST(paidEvent())
    expect(res.status).toBe(200)

    expect(nycmaidNotify).not.toHaveBeenCalled()

    const cleanerCall = sendSMS.mock.calls.find(args => args[0].to === '+15551230000')
    expect(cleanerCall).toBeTruthy()
    expect(cleanerCall?.[0].body).not.toMatch(/check out/i)
  })
})
