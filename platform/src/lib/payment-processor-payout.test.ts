/**
 * payment-processor.ts `processPayment` — CLEANER PAYOUT math (P1/W1 queue item c).
 *
 * The sibling payment-processor-math.test.ts deliberately seeds NO team-member
 * Stripe account, so the auto-payout branch (lines ~217-295) never runs there.
 * That branch is money OUT to a cleaner — a wrong rate or a mis-split tip
 * over/under-pays a real person — and it was untested. This pins it.
 *
 * The payout base amount is resolved in this precedence:
 *   1. booking.team_member_pay (the closeout/recap breakdown) wins outright;
 *   2. else pay_rate || hourly_rate || booking.pay_rate || 25 (default), × hours;
 * and the TIP passes through 100% ON TOP: the Stripe transfer sends base+tip,
 * while the team_member_payouts ROW decomposes it back into
 *   amount_cents = base   (payAmountCents − tipCents),  tip_cents = tip.
 * That decomposition is the subtle edge — the transfer and the recorded row use
 * different numbers on purpose, and a reorder of the `payAmountCents += tipCents`
 * line would silently corrupt the payout ledger.
 *
 * Drives the REAL processPayment against the shared in-memory Supabase fake with
 * Stripe fully mocked (transfers/payouts are vi.fns; no network, no real key).
 * ledger/SMS/notify side-effects are no-ops. Non-nycmaid tenant, so the location
 * rate floor never applies. Client rate (hourly_rate) and cleaner rate (pay_rate)
 * are kept DISTINCT so a test can't pass by conflating them.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

// Stripe payout primitives as spies so we can assert the exact transfer amount.
const stripeCalls = vi.hoisted(() => ({
  transfers: vi.fn((args: Record<string, unknown>) => Promise.resolve({ id: 'tr_1', ...args })),
  payouts: vi.fn(() => Promise.resolve({ id: 'po_1' })),
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(() => Promise.resolve()) }))
vi.mock('stripe', () => ({
  default: class {
    transfers = { create: stripeCalls.transfers }
    payouts = { create: stripeCalls.payouts }
  },
}))

import { processPayment } from './payment-processor'

const TENANT = 'tenant-pp' // NOT nycmaid → no location rate floor

// Both key fields DEFINED → hydrateTenant short-circuits. No telnyx → SMS inert.
// stripe_api_key null → getStripe falls back to env STRIPE_SECRET_KEY.
const tenant = { id: TENANT, name: 'Acme', stripe_api_key: null, telnyx_api_key: null, telnyx_phone: null }

type TM = {
  stripe_account_id?: string | null
  pay_rate?: number | null
  hourly_rate?: number | null
  preferred_language?: string | null
}
type BookingSeed = {
  actual_hours?: number | null
  hourly_rate?: number | null   // CLIENT rate (drives expectedCents)
  price?: number | null
  pay_rate?: number | null      // booking-level cleaner rate fallback
  team_member_pay?: number | null
  tm: TM | null
}

function seedBooking(id: string, b: BookingSeed) {
  ;(h.store.bookings ||= []).push({
    id,
    tenant_id: TENANT,
    team_member_id: b.tm ? 'tm-1' : null,
    client_id: 'client-1',
    team_member_pay: b.team_member_pay ?? null,
    actual_hours: b.actual_hours ?? null,
    hourly_rate: b.hourly_rate ?? null,
    pay_rate: b.pay_rate ?? null,
    price: b.price ?? null,
    check_in_time: null,
    start_time: null,
    clients: { name: 'Pat', phone: null, address: null },
    team_members: b.tm
      ? {
          name: 'Sam',
          phone: null,
          sms_consent: false,
          stripe_account_id: b.tm.stripe_account_id ?? null,
          hourly_rate: b.tm.hourly_rate ?? null,
          pay_rate: b.tm.pay_rate ?? null,
          preferred_language: b.tm.preferred_language ?? null,
        }
      : null,
  })
}

function pay(bookingId: string, amountCents: number) {
  return processPayment({
    tenant, bookingId, clientId: 'client-1', method: 'zelle', amountCents, referenceId: `ref-${bookingId}`,
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = { bookings: [], payments: [], team_member_payouts: [], clients: [] }
  stripeCalls.transfers.mockClear()
  stripeCalls.payouts.mockClear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('processPayment — cleaner payout base resolution', () => {
  it('uses booking.team_member_pay verbatim when present (ignores hours/rate)', async () => {
    // team_member_pay=$80 wins even though pay_rate=$99 would compute differently.
    // Client billed via price ($100); pay exactly $100 → paid, no tip.
    seedBooking('bkA', { price: 10000, team_member_pay: 8000, tm: { stripe_account_id: 'acct_1', pay_rate: 99 } })
    const r = await pay('bkA', 10000)
    expect(r?.status).toBe('paid')
    expect(r?.tipCents).toBe(0)
    expect(r?.cleanerPaidCents).toBe(8000)
    expect(stripeCalls.transfers).toHaveBeenCalledTimes(1)
    expect(stripeCalls.transfers.mock.calls[0][0]).toMatchObject({ amount: 8000, destination: 'acct_1' })
    expect(h.store.team_member_payouts).toHaveLength(1)
    expect(h.store.team_member_payouts[0]).toMatchObject({ amount_cents: 8000, tip_cents: 0, status: 'transferred' })
  })

  it('computes pay_rate × actual_hours when no team_member_pay (cleaner rate ≠ client rate)', async () => {
    // Client rate $50 × 2h = $100 expected → pay $100 → paid. Cleaner rate $30 ×
    // 2h = $60 payout. Proves the payout uses the CLEANER rate, not the client's.
    seedBooking('bkB', { actual_hours: 2, hourly_rate: 50, team_member_pay: null, tm: { stripe_account_id: 'acct_1', pay_rate: 30 } })
    const r = await pay('bkB', 10000)
    expect(r?.status).toBe('paid')
    expect(r?.cleanerPaidCents).toBe(6000)
    expect(stripeCalls.transfers.mock.calls[0][0]).toMatchObject({ amount: 6000 })
    expect(h.store.team_member_payouts[0]).toMatchObject({ amount_cents: 6000, tip_cents: 0 })
  })

  it('falls back to the $25 default rate when no pay_rate/hourly_rate anywhere', async () => {
    seedBooking('bkC', { actual_hours: 2, hourly_rate: 50, team_member_pay: null, pay_rate: null, tm: { stripe_account_id: 'acct_1', pay_rate: null, hourly_rate: null } })
    const r = await pay('bkC', 10000)
    expect(r?.cleanerPaidCents).toBe(5000) // 2h × $25
  })
})

describe('processPayment — tip passes through 100% and the payout row splits it', () => {
  it('transfer sends base+tip; the recorded row keeps base and tip on separate columns', async () => {
    // Client expected $100 (price), paid $120 → tip $20. Cleaner base $80
    // (team_member_pay). Transfer = 80 + 20 = $100. Row: amount_cents=8000 (base),
    // tip_cents=2000. The transfer total and the row's base intentionally differ.
    seedBooking('bkD', { price: 10000, team_member_pay: 8000, tm: { stripe_account_id: 'acct_1' } })
    const r = await pay('bkD', 12000)
    expect(r?.status).toBe('paid')
    expect(r?.tipCents).toBe(2000)
    expect(r?.cleanerPaidCents).toBe(10000) // base + tip actually transferred
    expect(stripeCalls.transfers.mock.calls[0][0]).toMatchObject({ amount: 10000 })
    expect(h.store.team_member_payouts[0]).toMatchObject({ amount_cents: 8000, tip_cents: 2000 })
    // booking is flagged paid-out
    expect(h.store.bookings.find((b) => b.id === 'bkD')).toMatchObject({ team_member_paid: true })
  })
})

describe('processPayment — payout is skipped when the cleaner has no Stripe account', () => {
  it('marks the booking paid but transfers nothing and records no payout', async () => {
    seedBooking('bkE', { price: 10000, team_member_pay: 8000, tm: { stripe_account_id: null } })
    const r = await pay('bkE', 10000)
    expect(r?.status).toBe('paid')
    expect(r?.cleanerPaidCents).toBe(0)
    expect(stripeCalls.transfers).not.toHaveBeenCalled()
    expect(h.store.team_member_payouts).toHaveLength(0)
  })
})
