/**
 * Money-math edge cases: refund + proration + partial-payment correctness,
 * tenant-scoped (P1/W1 queue item b, re-queued).
 *
 * Scope + honesty about what "proration" means here:
 *
 *  - PRORATION (syncSubscriptionSeats, platform-billing.ts): the platform does
 *    NOT hand-roll any proration formula — it delegates proration to Stripe via
 *    `proration_behavior: 'create_prorations'`. So "proration correctness" is (1)
 *    the SEAT-QUANTITY math we feed Stripe (admin clamp >=1, team floor >=0,
 *    fractional flooring, team-line removal at 0) and (2) the CONTRACT that every
 *    seat change actually requests proration. A hand-rolled proration test would
 *    have to test code that does not exist; these tests pin the real surface.
 *
 *  - PARTIAL-PAYMENT (processPayment, payment-processor.ts): the 95% threshold,
 *    tip = overpayment, shortfall, prior-payment accumulation flipping
 *    partial->paid, and that the prior-payment sum is tenant-scoped.
 *
 *  - REFUND (postRefundToLedger, finance/post-adjustments.ts): COMPLEMENTARY to
 *    money-adjustments.test.ts (which already pins single-refund amounts,
 *    zero/negative rejection, per-id idempotency, and mixed tenant scope). Here:
 *    cumulative multi-refund summing, and the deliberate "trusts its caller"
 *    contract (amount validated upstream at Stripe, not re-clamped in the ledger).
 *
 * Real code under test; a shared in-memory Supabase fake (with the
 * `post_journal_entry` RPC + upsert idempotency the ledger path needs — the
 * extracted src/test/supabase-fake.ts intentionally omits both) and a captured
 * fake Stripe. No network, no DB.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
// Import the fake BEFORE any module that pulls @/lib/supabase (e.g. ./ledger),
// so its binding is initialized before the hoisted vi.mock factory fires.
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import {
  PLATFORM_ADMIN_LOOKUP as ADMIN_LOOKUP,
  PLATFORM_MEMBER_LOOKUP as MEMBER_LOOKUP,
  PLATFORM_SETUP_LOOKUP as SETUP_LOOKUP,
} from '@/test/platform-billing-lookup-keys'
import { DEFAULT_CHART } from './ledger'

// ---- hoisted state the vi.mock factories close over --------------------------
const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))
const sfx = vi.hoisted(() => ({
  // fake Stripe capture for the proration tests
  sub: { items: { data: [] as Array<{ id: string; price: { id: string } }> } },
  updateCalls: [] as Array<{ id: string; params: Record<string, unknown> }>,
}))

// The three lookup_key constants are shared via @/test/platform-billing-lookup-keys
// (imported above, aliased). They mirror platform-billing.ts's module-private
// constants; if those drift, ensurePlatformPrices() won't match a returned price and
// falls through to products.create — which throws below, failing LOUD rather than
// silently minting a phantom price. Centralized so drift is reconciled in one place.

// ---- in-memory Supabase fake (ledger RPC + upsert idempotency) ---------------
// Shared with money-adjustments.test.ts via @/test/ledger-supabase-fake.
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

// Fake Stripe for proration: prices.list returns the three expected prices so
// ensurePlatformPrices() finds them all; subscriptions.retrieve/update are driven
// by / captured into `sfx`. Any unexpected create throws (drift guard).
const fakeStripe = {
  prices: {
    list: () => Promise.resolve({
      data: [
        { id: 'price_admin', lookup_key: ADMIN_LOOKUP },
        { id: 'price_member', lookup_key: MEMBER_LOOKUP },
        { id: 'price_setup', lookup_key: SETUP_LOOKUP },
      ],
    }),
    create: () => { throw new Error('unexpected prices.create — lookup_key drift?') },
  },
  products: { create: () => { throw new Error('unexpected products.create — lookup_key drift?') } },
  subscriptions: {
    retrieve: () => Promise.resolve(sfx.sub),
    update: (id: string, params: Record<string, unknown>) => { sfx.updateCalls.push({ id, params }); return Promise.resolve({}) },
  },
}
vi.mock('@/lib/stripe', () => ({ getStripe: () => fakeStripe }))

// Side-effect modules processPayment reaches — silence them (no SMS / network /
// extra ledger writes); the math under test is unaffected.
vi.mock('@/lib/sms', () => ({ sendSMS: () => Promise.resolve() }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: () => Promise.resolve() }))
vi.mock('@/lib/notify', () => ({ notify: () => Promise.resolve() }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: () => Promise.resolve({ posted: false }) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: () => Promise.resolve({ posted: false }) }))

import { postRefundToLedger } from './finance/post-adjustments'
import { processPayment } from './payment-processor'
import { syncSubscriptionSeats } from './platform-billing'

const A = 'tenant-A'
const B = 'tenant-B'

function seedChart(tenantId: string) {
  ;(h.store.chart_of_accounts ||= []).push(
    ...DEFAULT_CHART.map((a) => ({ id: `coa-${tenantId}-${a.code}`, tenant_id: tenantId, code: a.code, name: a.name, type: a.type })),
  )
}

function linesByCode(entryId: string, tenantId: string) {
  const codeOf = (coaId: unknown) =>
    (h.store.chart_of_accounts || []).find((c) => c.id === coaId && c.tenant_id === tenantId)?.code as string
  const out: Record<string, { debit: number; credit: number }> = {}
  for (const l of (h.store.journal_entry_lines || []).filter((x) => x.entry_id === entryId)) {
    out[codeOf(l.coa_id)] = { debit: Number(l.debit_cents) || 0, credit: Number(l.credit_cents) || 0 }
  }
  return out
}

function seedBooking(fields: Record<string, unknown>) {
  ;(h.store.bookings ||= []).push({
    id: 'bk1', tenant_id: A, team_member_id: null, client_id: 'cl1',
    team_member_pay: null, actual_hours: null, hourly_rate: null, pay_rate: null,
    price: null, check_in_time: null, start_time: null,
    clients: { name: 'Ann', phone: null, address: null }, team_members: null,
    ...fields,
  })
}

async function pay(amountCents: number) {
  return processPayment({
    tenant: { id: A, name: 'A', stripe_api_key: null, telnyx_api_key: null, telnyx_phone: null },
    bookingId: 'bk1', clientId: 'cl1', method: 'zelle', amountCents, referenceId: `ref-${amountCents}`,
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = { chart_of_accounts: [], journal_entries: [], journal_entry_lines: [], bookings: [], payments: [], admin_tasks: [], clients: [] }
  seedChart(A)
  seedChart(B)
  sfx.sub = { items: { data: [] } }
  sfx.updateCalls = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

// ============================================================================
// PRORATION — seat-quantity math + the create_prorations contract we hand Stripe
// ============================================================================
describe('syncSubscriptionSeats — proration is Stripe-delegated; we feed it correct seat quantities', () => {
  const lastItems = () => (sfx.updateCalls[0].params.items as Array<Record<string, unknown>>)

  it('every seat change requests create_prorations (the whole reason we do not hand-roll proration)', async () => {
    sfx.sub = { items: { data: [] } }
    await syncSubscriptionSeats('sub_1', 2, 1)
    expect(sfx.updateCalls).toHaveLength(1)
    expect(sfx.updateCalls[0].params.proration_behavior).toBe('create_prorations')
  })

  it('clamps admin seats to a minimum of 1 and floors fractional counts', async () => {
    sfx.sub = { items: { data: [
      { id: 'si_admin', price: { id: 'price_admin' } },
      { id: 'si_member', price: { id: 'price_member' } },
    ] } }
    await syncSubscriptionSeats('sub_1', 0, 2.9)   // admins 0 -> 1; team 2.9 -> 2
    const items = lastItems()
    expect(items).toContainEqual({ id: 'si_admin', quantity: 1 })
    expect(items).toContainEqual({ id: 'si_member', quantity: 2 })
  })

  it('adds a NEW price line when that seat is not already on the subscription', async () => {
    sfx.sub = { items: { data: [] } }
    await syncSubscriptionSeats('sub_1', 3, 1)
    const items = lastItems()
    expect(items).toContainEqual({ price: 'price_admin', quantity: 3 })
    expect(items).toContainEqual({ price: 'price_member', quantity: 1 })
  })

  it('removes the team line item when team seats drop to 0 (deleted, not quantity 0)', async () => {
    sfx.sub = { items: { data: [
      { id: 'si_admin', price: { id: 'price_admin' } },
      { id: 'si_member', price: { id: 'price_member' } },
    ] } }
    await syncSubscriptionSeats('sub_1', 2, 0)
    const items = lastItems()
    expect(items).toContainEqual({ id: 'si_admin', quantity: 2 })
    expect(items).toContainEqual({ id: 'si_member', deleted: true })
    // never a quantity:0 team line (Stripe would keep billing it)
    expect(items.some((i) => i.id === 'si_member' && 'quantity' in i)).toBe(false)
  })

  it('emits no team line at all when team seats are 0 and none exists yet', async () => {
    sfx.sub = { items: { data: [{ id: 'si_admin', price: { id: 'price_admin' } }] } }
    await syncSubscriptionSeats('sub_1', 1, 0)
    const items = lastItems()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: 'si_admin', quantity: 1 })
  })
})

// ============================================================================
// PARTIAL-PAYMENT — the 95% threshold, tip, shortfall, accumulation, tenant scope
// ============================================================================
describe('processPayment — partial vs paid, tip, and shortfall math', () => {
  it('exact expected amount -> paid, zero tip', async () => {
    seedBooking({ price: 10000 })
    const r = await pay(10000)
    expect(r).toMatchObject({ status: 'paid', totalReceivedCents: 10000, expectedCents: 10000, tipCents: 0 })
    expect((h.store.payments[0] as Record<string, unknown>).status).toBe('completed')
    expect(h.store.bookings[0].payment_status).toBe('paid')
  })

  it('overpayment -> the overage is recorded as tip, still paid', async () => {
    seedBooking({ price: 10000 })
    const r = await pay(12000)
    expect(r).toMatchObject({ status: 'paid', tipCents: 2000 })
    expect((h.store.payments[0] as Record<string, unknown>).tip_cents).toBe(2000)
    expect(h.store.bookings[0].tip_amount).toBe(2000)
  })

  it('94% of expected -> partial: no tip, correct shortfall, booking + admin task recorded', async () => {
    seedBooking({ price: 10000 })
    const r = await pay(9400)
    expect(r).toMatchObject({ status: 'partial', totalReceivedCents: 9400, expectedCents: 10000, tipCents: 0 })
    const p = h.store.payments[0] as Record<string, unknown>
    expect(p.status).toBe('partial')
    expect(p.tip_cents).toBe(0)   // a partial payment never books a tip
    expect(h.store.bookings[0].payment_status).toBe('partial')
    expect(h.store.bookings[0].partial_payment_cents).toBe(9400)   // shortfall = 600
    expect((h.store.admin_tasks || []).some((t) => t.type === 'payment_partial')).toBe(true)
  })

  it('exactly 95% -> NOT partial (paid): the threshold is strict "< 0.95"', async () => {
    seedBooking({ price: 10000 })
    const r = await pay(9500)   // 9500 < 10000*0.95=9500 is false -> paid
    expect(r).toMatchObject({ status: 'paid', tipCents: 0 })
    expect(h.store.bookings[0].payment_status).toBe('paid')
  })

  it('a prior partial payment accumulates: a later top-up flips the booking to paid', async () => {
    seedBooking({ price: 10000 })
    ;(h.store.payments ||= []).push({ id: 'pp0', tenant_id: A, booking_id: 'bk1', amount_cents: 6000 })
    const r = await pay(4000)   // prior 6000 + 4000 = 10000
    expect(r).toMatchObject({ status: 'paid', totalReceivedCents: 10000 })
    expect(h.store.bookings[0].payment_status).toBe('paid')
  })

  it('the prior-payment sum is TENANT-SCOPED: another tenant\'s payment on the same booking id is not counted', async () => {
    seedBooking({ price: 10000 })
    // A large payment recorded under tenant B for the same booking id.
    ;(h.store.payments ||= []).push({ id: 'ppB', tenant_id: B, booking_id: 'bk1', amount_cents: 9999 })
    const r = await pay(9400)
    // If B's 9999 leaked in, total would be 19399 -> paid. Tenant scoping keeps it partial.
    expect(r).toMatchObject({ status: 'partial', totalReceivedCents: 9400 })
  })

  it('bills ACTUAL hours over the booked price (overruns are not under-billed)', async () => {
    seedBooking({ price: 10000, actual_hours: 3, hourly_rate: 69 })   // expected = 3 * 69 * 100 = 20700
    const r = await pay(20700)
    expect(r).toMatchObject({ status: 'paid', expectedCents: 20700, tipCents: 0 })
  })
})

// ============================================================================
// REFUND — complementary to money-adjustments.test.ts (cumulative + contract)
// ============================================================================
describe('postRefundToLedger — cumulative refunds and the trusts-its-caller contract', () => {
  it('two distinct refunds against the same sale post independently and sum in the ledger', async () => {
    const r1 = await postRefundToLedger({ tenantId: A, sourceId: 're_a1', amountCents: 3000 })
    const r2 = await postRefundToLedger({ tenantId: A, sourceId: 're_a2', amountCents: 2000 })
    expect(r1.posted).toBe(true)
    expect(r2.posted).toBe(true)
    expect(h.store.journal_entries.filter((e) => e.source === 'refund')).toHaveLength(2)
    // Combined: DR 4000 5000 / CR 1050 5000 across the two entries.
    const l1 = linesByCode(r1.entryId!, A), l2 = linesByCode(r2.entryId!, A)
    expect(l1['1050'].credit + l2['1050'].credit).toBe(5000)
    expect(l1['4000'].debit + l2['4000'].debit).toBe(5000)
  })

  it('trusts its caller: refunds the exact amount even if it exceeds a recorded deposit (amount is validated upstream at Stripe)', async () => {
    const r = await postRefundToLedger({ tenantId: A, sourceId: 're_over', amountCents: 999999 })
    expect(r.posted).toBe(true)
    expect(linesByCode(r.entryId!, A)['4000'].debit).toBe(999999)
  })

  it('a refund posted for tenant B never appears under tenant A', async () => {
    await postRefundToLedger({ tenantId: A, sourceId: 're_a', amountCents: 1000 })
    await postRefundToLedger({ tenantId: B, sourceId: 're_b', amountCents: 4000 })
    expect(h.store.journal_entries.filter((e) => e.tenant_id === A && e.source === 'refund')).toHaveLength(1)
    expect(h.store.journal_entries.filter((e) => e.tenant_id === B && e.source === 'refund')).toHaveLength(1)
    expect((h.store.journal_entry_lines || []).filter((l) => l.tenant_id === A).every((l) => Number(l.debit_cents) + Number(l.credit_cents) === 1000)).toBe(true)
  })
})
