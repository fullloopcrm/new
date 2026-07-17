import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * `client_reference_id` is a public Stripe Payment Link query param — anyone
 * holding a tenant's static payment-link URL can overwrite it in their own
 * browser (`?client_reference_id=<anything>`) before paying. The
 * checkout.session.completed handler's "static pay-link" fallback used that
 * value to resolve a booking with NO tenant filter, so a payer on NYC Maid's
 * static link could redirect the payment to mark a DIFFERENT tenant's
 * booking "paid" — and, if that booking's cleaner has Stripe Connect, trigger
 * a real cross-tenant payout — regardless of what was actually charged.
 *
 * This mirrors the rule the charge.refunded handler already enforces (see
 * route.cross-tenant-refund.isolation.test.ts): an event-supplied identifier
 * must never be trusted to pick the tenant. The fix scopes the
 * client_reference_id booking lookup to the one tenant this static link
 * belongs to (NYCMAID_TENANT_ID), same as the email-recovery fallback a few
 * lines below it in the same handler.
 */

const VICTIM_TENANT = 'tenant-other'
const VICTIM_BOOKING = 'booking-victim'

const transfersCreate = vi.fn(async () => ({ id: 'tr_should_never_happen' }))
const payoutsCreate = vi.fn(async () => ({ id: 'po_should_never_happen' }))

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: (body: string) => JSON.parse(body) }
    transfers = { create: transfersCreate }
    payouts = { create: payoutsCreate }
  }
  return { default: MockStripe }
})

const h = vi.hoisted(() => ({
  paymentsInsert: vi.fn(async (_row: Record<string, unknown>) => ({ data: { id: 'payment-row' }, error: null })),
  bookingsUpdate: vi.fn((_patch: Record<string, unknown>) => {}),
  nmSmsAdmins: vi.fn(async () => {}),
}))

// Full victim booking, priced to exactly match what the attacker's static
// link charges (amount_total below) so, if the bug is present, the route
// treats it as fully paid — not partial — and reaches the cleaner-payout
// branch (tm has a Stripe Connect account).
const VICTIM_ROW = {
  id: VICTIM_BOOKING,
  tenant_id: VICTIM_TENANT,
  client_id: 'client-victim',
  team_member_id: 'tm-victim',
  hourly_rate: 69,
  pay_rate: 25,
  team_member_pay: null,
  team_member_paid: false,
  actual_hours: 2,
  price: 50000,
  team_members: { name: 'Victim Cleaner', phone: '+15550000000', pay_rate: 25, stripe_account_id: 'acct_victim', preferred_language: 'en' },
  clients: { name: 'Victim Client', phone: '+15551110000', address: '1 Victim St' },
  tenants: { name: 'Other Co', telnyx_api_key: null, telnyx_phone: null },
}

// Real DB semantics: `.eq(...)` narrows, it does not select. The victim
// booking only comes back if every applied filter matches its real row —
// this proves the fix (tenant_id scoping), not just a hardcoded mock return.
function bookingsChain() {
  const filters: Record<string, unknown> = {}
  const matches = () => Object.entries(filters).every(([k, v]) => (VICTIM_ROW as Record<string, unknown>)[k] === v)
  const c: Record<string, unknown> = {
    // The claim update ends in `.select('id')` with no `.single()`/`.maybeSingle()`
    // and is awaited directly — make the returned object thenable so `await`
    // resolves it like the real postgrest-js response, while still exposing
    // eq/maybeSingle/single for the OTHER select usages earlier in the chain.
    select: () => ({
      ...c,
      then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
        resolve({ data: matches() ? [{ id: VICTIM_ROW.id }] : [], error: null }),
    }),
    eq: (col: string, val: unknown) => {
      filters[col] = val
      return c
    },
    or: () => c,
    update: (patch: Record<string, unknown>) => {
      h.bookingsUpdate(patch)
      return c
    },
    maybeSingle: async () => ({ data: matches() ? { id: VICTIM_ROW.id, tenant_id: VICTIM_ROW.tenant_id } : null, error: null }),
    single: async () => ({ data: matches() ? VICTIM_ROW : null, error: null }),
  }
  return c
}

function genericChain(table: string) {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    limit: () => c,
    ilike: () => c,
    order: () => c,
    is: () => c,
    in: () => c,
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: [], error: null }),
    insert: (row: Record<string, unknown>) => {
      if (table === 'payments') {
        h.paymentsInsert(row)
        return { select: () => ({ single: async () => ({ data: { id: 'payment-row' }, error: null }) }) }
      }
      return { select: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }) }
    },
    update: () => c,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => (t === 'bookings' ? bookingsChain() : genericChain(t)),
  },
}))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postDepositToLedger: vi.fn(async () => ({ posted: true })),
  postRefundToLedger: vi.fn(async () => ({ posted: true })),
  postChargebackToLedger: vi.fn(async () => ({ posted: true })),
  tenantFromPaymentIntent: vi.fn(async () => null),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: h.nmSmsAdmins }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false, NYCMAID_TENANT_ID: 'nycmaid' }))

import { POST } from './route'

function staticLinkEvent(clientReferenceId: string) {
  const session = {
    id: 'cs_static_1',
    amount_total: 50000,
    payment_intent: 'pi_static_1',
    client_reference_id: clientReferenceId,
    customer_details: {},
    metadata: {},
  }
  return new Request('https://app.fullloop.example/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 'sig_test' },
    body: JSON.stringify({ type: 'checkout.session.completed', data: { object: session } }),
  })
}

beforeEach(() => {
  transfersCreate.mockClear()
  payoutsCreate.mockClear()
  h.paymentsInsert.mockClear()
  h.bookingsUpdate.mockClear()
  h.nmSmsAdmins.mockClear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy'
})

describe('POST /api/webhooks/stripe — client_reference_id static-link fallback cannot cross tenants', () => {
  it('does not resolve, mark paid, or pay out a booking owned by a different tenant', async () => {
    const res = await staticLinkEventResponse(VICTIM_BOOKING)
    expect(res.status).toBe(200)

    // The bug: no tenant filter meant the victim's booking WAS resolved and
    // its payment_status got flipped to 'paid'/'partial'. The fix: the
    // lookup is scoped to NYCMAID_TENANT_ID, so a booking belonging to
    // 'tenant-other' never matches and nothing about it is ever touched.
    expect(h.bookingsUpdate).not.toHaveBeenCalled()
    expect(h.paymentsInsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: VICTIM_TENANT, booking_id: VICTIM_BOOKING }),
    )
    expect(transfersCreate).not.toHaveBeenCalled()
    expect(payoutsCreate).not.toHaveBeenCalled()
  })
})

async function staticLinkEventResponse(clientReferenceId: string) {
  return POST(staticLinkEvent(clientReferenceId))
}
