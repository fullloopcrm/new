import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * PARITY-DIFF (W4, PAYMENT lane): the cutover audit (nycmaid-cutover-plan-2026-07-07.md
 * §5 "Money engine") flagged that `admin/payments/finalize-match` calls
 * `processPayment()` with no $35 NJ/Long Island/Westchester floor applied, and
 * that nycmaid's own `64cba3c` fixed a naive-date `check_in_time` parsing bug in
 * the same function. Both are already fixed in payment-processor.ts (commit
 * 10546d92 — `isNycMaid(tenantId) ? effectiveCleanerRate(...)` at line ~226 and
 * `parseTimestamp(...)` at line ~230), and finalize-match/route.ts calls
 * processPayment directly so it inherits both fixes for free. Neither had a
 * test proving the behavior, which is exactly what the cutover checklist's
 * "money engine" item was still waiting on. This closes that gap.
 *
 * REAL: effectiveCleanerRate/isPremiumPayZone (cleaner-pay.ts), isNycMaid
 * (nycmaid/tenant.ts), parseTimestamp (dates.ts) — the actual logic under test.
 * MOCKED: Stripe SDK, supabase, sms/notify/admin-contacts side effects, finance
 * ledger posts.
 */

const NYCMAID_TENANT = '00000000-0000-0000-0000-000000000001'
const OTHER_TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

type Row = Record<string, unknown>
let bookingRow: Row
let priorPayments: Row[]
const bookingUpdates: Row[] = []
const payoutInserts: Row[] = []
const transfersCreated: Row[] = []

vi.mock('stripe', () => ({
  default: class MockStripe {
    transfers = {
      create: async (p: Row) => { transfersCreated.push(p); return { id: 'tr_1' } },
    }
    payouts = {
      create: async (p: Row) => { void p; return { id: 'po_1' } },
    }
  },
}))

vi.mock('./supabase', () => {
  function chain(table: string) {
    let didUpdate = false
    let updatePayload: Row = {}
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { didUpdate = true; updatePayload = p; return c },
      insert: (p: Row) => {
        if (table === 'team_member_payouts') payoutInserts.push(p as Row)
        return c
      },
      eq: () => c,
      limit: () => c,
      single: async () => {
        if (didUpdate && table === 'bookings') { bookingUpdates.push({ ...updatePayload }); return { data: null, error: null } }
        if (table === 'bookings') return { data: bookingRow, error: null }
        if (table === 'tenants') return { data: { id: bookingRow.tenant_id, name: 'T', stripe_api_key: null, telnyx_api_key: null, telnyx_phone: null }, error: null }
        if (table === 'clients') return { data: { phone: null }, error: null }
        if (table === 'team_member_payouts') return { data: { id: 'payout-1' }, error: null }
        return { data: null, error: null }
      },
      // cleanerAlreadyPaid()'s pre-checks — no prior payout, booking's own flag.
      maybeSingle: async () => {
        if (table === 'team_member_payouts') return { data: null, error: null }
        if (table === 'bookings') return { data: bookingRow, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (table === 'payments') return res({ data: priorPayments, error: null })
        return res({ data: [], error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('./sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('./admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('./notify', () => ({ notify: async () => ({ success: true }) }))
vi.mock('./secret-crypto', () => ({ decryptSecret: (v: string) => v }))
vi.mock('./finance/post-revenue', () => ({ postPaymentRevenue: async () => {} }))
vi.mock('./finance/post-labor', () => ({ postPayoutToLedger: async () => {} }))

import { processPayment } from './payment-processor'

function baseBooking(over: Row = {}): Row {
  return {
    id: BOOKING_ID,
    tenant_id: NYCMAID_TENANT,
    team_member_id: 'tm-1',
    client_id: 'c-1',
    team_member_pay: null,
    actual_hours: null,
    hourly_rate: 69,
    pay_rate: null,
    price: null,
    check_in_time: null,
    start_time: '2026-08-14T18:00:00Z',
    clients: { name: 'Client', phone: null, address: '10 Main St, Hoboken, NJ 07030' },
    team_members: {
      name: 'Worker', phone: null, sms_consent: false,
      stripe_account_id: 'acct_1', hourly_rate: null, pay_rate: 25, preferred_language: 'en',
    },
    ...over,
  }
}

beforeEach(() => {
  bookingUpdates.length = 0
  payoutInserts.length = 0
  transfersCreated.length = 0
  priorPayments = []
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('processPayment — money engine ($35 premium-zone floor + naive-date check_in_time)', () => {
  it('applies the $35 NJ/LI/Westchester floor for the NYC Maid tenant when paying via check-in-elapsed time', async () => {
    // "Now" fixed at 20:30 UTC; check_in_time is a NAIVE (no Z/offset) Postgres-style
    // string 2.5 UTC-hours earlier. If check_in_time were parsed in the server's
    // local zone instead of UTC (the bug nycmaid's 64cba3c fixed), this elapsed-time
    // math would be wrong by the local UTC offset instead of the true 150 minutes.
    vi.setSystemTime(new Date('2026-08-14T20:30:00.000Z'))
    bookingRow = baseBooking({ check_in_time: '2026-08-14 18:00:00', pay_rate: 25 })
    priorPayments = []

    // Client billing (a separate formula, ceil + 30min buffer) on 150 raw
    // minutes -> 3.0h @ $69/hr = $207.00. Pay exactly that so the payment is
    // "paid" with zero tip, isolating the cleaner-pay-side math under test.
    const result = await processPayment({
      tenant: { id: NYCMAID_TENANT },
      bookingId: BOOKING_ID,
      clientId: 'c-1',
      method: 'zelle',
      amountCents: 20_700,
      referenceId: 'ref-1',
    })

    expect(result?.status).toBe('paid')
    // rawMinutes = 150 -> estHours = round(150/30)*0.5 = 2.5h. NJ address on the
    // NYC Maid tenant floors the $25 base rate to the flat $35 premium rate.
    expect(transfersCreated).toHaveLength(1)
    expect(transfersCreated[0].amount).toBe(Math.round(2.5 * 35 * 100))
  })

  it('does NOT apply the $35 floor for a non-NYC-Maid tenant with the same NJ address', async () => {
    vi.setSystemTime(new Date('2026-08-14T20:30:00.000Z'))
    bookingRow = baseBooking({ tenant_id: OTHER_TENANT, check_in_time: '2026-08-14 18:00:00', pay_rate: 25 })
    priorPayments = []

    await processPayment({
      tenant: { id: OTHER_TENANT },
      bookingId: BOOKING_ID,
      clientId: 'c-1',
      method: 'zelle',
      amountCents: 20_700,
      referenceId: 'ref-1',
    })

    // Same elapsed time, but base rate ($25) is NOT floored to $35 off-tenant.
    expect(transfersCreated).toHaveLength(1)
    expect(transfersCreated[0].amount).toBe(Math.round(2.5 * 25 * 100))
  })

  it('the admin/payments/finalize-match edge case: no team_member_pay preset + no actual_hours falls through to the (now-fixed) check-in path, not a silent $0/uncapped payout', async () => {
    vi.setSystemTime(new Date('2026-08-14T21:00:00.000Z'))
    bookingRow = baseBooking({ check_in_time: '2026-08-14 19:00:00', team_member_pay: null, actual_hours: null, pay_rate: 25 })
    priorPayments = []

    // rawMinutes = 120 -> client estHours = ceil((120+30)/30)*0.5 = 2.5h @ $69/hr.
    const result = await processPayment({
      tenant: { id: NYCMAID_TENANT },
      bookingId: BOOKING_ID,
      clientId: 'c-1',
      method: 'venmo',
      amountCents: 17_250,
      referenceId: 'ref-2',
    })

    expect(result?.cleanerPaidCents).toBeGreaterThan(0)
    // 120 min elapsed -> round(120/30)*0.5 = 2.0h * $35 floor = $70.00
    expect(transfersCreated[0].amount).toBe(7000)
  })
})
