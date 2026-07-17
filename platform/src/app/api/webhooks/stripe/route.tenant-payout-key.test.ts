/**
 * Stripe webhook — cleaner Connect payout (checkout.session.completed step 4)
 * previously always used the platform's global STRIPE_SECRET_KEY for
 * `stripe.transfers.create`/`stripe.payouts.create`, unlike the sibling
 * money-movement path in payment-processor.ts (`getStripe(tenant.stripe_api_key)`)
 * and unlike team-members/[id]/stripe-onboard, which creates the cleaner's
 * Connect Express sub-account under the TENANT's own Stripe account when
 * tenant.stripe_api_key is configured.
 *
 * For any tenant with their own key set, that mismatch meant the transfer's
 * `destination` (the sub-account id) was looked up under the wrong Stripe
 * account — Stripe returns resource-not-found, the payout throws, and the
 * cleaner never actually gets auto-paid; only an admin_tasks row records the
 * failure. Fixed by threading tenant.stripe_api_key through getStripe() for
 * this call site the same way the other two already do. Webhook signature
 * verification (module-level getStripe() with no args) intentionally stays
 * on the platform key — unrelated to this bug.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import type { FakeStoreHandle } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({ store: {} as Record<string, Array<Record<string, unknown>>> }))
const stripeCtl = vi.hoisted(() => ({ current: null as unknown }))
const constructorKeys = vi.hoisted(() => [] as string[])

const postPaymentRevenue = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const postPayoutToLedger = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const postDepositToLedger = vi.hoisted(() => vi.fn(() => Promise.resolve({ posted: true })))
const postRefundToLedger = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const postChargebackToLedger = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const tenantFromPaymentIntent = vi.hoisted(() => vi.fn(() => Promise.resolve(null)))
const sendSMS = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const smsAdmins = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const nmSmsAdmins = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: makeLedgerSupabaseFake(h as unknown as FakeStoreHandle),
  supabase: makeLedgerSupabaseFake(h as unknown as FakeStoreHandle),
}))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postDepositToLedger, postRefundToLedger, postChargebackToLedger, tenantFromPaymentIntent,
}))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: nmSmsAdmins }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (s: string) => `dec:${s}` }))
vi.mock('stripe', () => ({
  default: class {
    constructor(key: string) {
      constructorKeys.push(key)
    }
    webhooks = { constructEvent: () => stripeCtl.current }
    transfers = { create: vi.fn(() => Promise.resolve({ id: 'tr_1' })) }
    payouts = { create: vi.fn(() => Promise.resolve(undefined)) }
    customers = { retrieve: vi.fn() }
  },
}))

import { POST as stripeWebhook } from './route'

function post() {
  return stripeWebhook(
    new Request('http://acme.example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=sig' },
      body: JSON.stringify({ id: 'evt_1' }),
    }),
  )
}

const TENANT = 'tenant-A'

function bookingSessionEvent(sessionId: string) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        amount_total: 10000,
        payment_intent: 'pi_1',
        metadata: { tenant_id: TENANT, booking_id: 'bk_1' },
      },
    },
  }
}

beforeEach(() => {
  constructorKeys.length = 0
  h.store = { payments: [], bookings: [], quotes: [], deals: [], deal_activities: [], notifications: [], admin_tasks: [], team_member_payouts: [] }
  h.store.bookings = [{
    id: 'bk_1',
    tenant_id: TENANT,
    client_id: 'client_1',
    team_member_id: 'tm_1',
    hourly_rate: 50,
    pay_rate: null,
    team_member_pay: null,
    actual_hours: 2,
    price: 10000,
    team_members: { name: 'Cleaner', phone: '+15551234567', pay_rate: 25, stripe_account_id: 'acct_123', preferred_language: 'en' },
    clients: { name: 'Client', phone: '+15559876543', address: '123 Main St' },
    tenants: { name: 'Acme', telnyx_api_key: null, telnyx_phone: null, stripe_api_key: null },
  }]
  stripeCtl.current = bookingSessionEvent('cs_ok_1')
  process.env.STRIPE_SECRET_KEY = 'sk_test_env'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('webhooks/stripe checkout.session.completed — tenant-key-first cleaner payout', () => {
  it('falls back to the platform env key when the tenant has none configured', async () => {
    const res = await post()
    expect(res.status).toBe(200)
    // Signature-verification client (no-arg) uses env key; the payout client
    // below must also fall back to env when the tenant has no key of its own.
    expect(constructorKeys.every((k) => k === 'sk_test_env')).toBe(true)
  })

  it("uses the TENANT's own configured (decrypted) key for the transfer/payout client, not the platform env key", async () => {
    ;(h.store.bookings[0].tenants as { stripe_api_key: string | null }).stripe_api_key = 'enc-tenant-key'
    const res = await post()
    expect(res.status).toBe(200)
    // The signature-verification client is always constructed with the env
    // key (no arg); the SEPARATE payout client must use the tenant's key.
    expect(constructorKeys).toContain('dec:enc-tenant-key')
    expect(constructorKeys[0]).toBe('sk_test_env')
  })
})
