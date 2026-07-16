import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Regression: payment-processor.double-payout.test.ts proves the SEQUENTIAL
 * case (call A fully completes, including its bookings.update() commit,
 * before call B starts) is deduped by the `!booking.team_member_paid` guard.
 * It does not prove the CONCURRENT case: `booking` is fetched ONCE at the
 * very top of processPayment(), long before the transfer is created, so two
 * calls that are genuinely in flight at the same time (e.g. two distinct
 * Zelle reconciliations landing within the same request-handling window) can
 * BOTH read team_member_paid: false before EITHER commits — the stale-read
 * TOCTOU race the atomic-claim UPDATE (`.or('team_member_paid.is.null,...')`
 * before the Stripe transfer, not after) exists to close.
 *
 * This test models that race directly: both calls' initial booking SELECT
 * returns a snapshot frozen at team_member_paid: false (matching real
 * Postgres read-committed semantics for two transactions started before
 * either writes), while the atomic-claim UPDATE checks/sets a single shared
 * `claimed` flag synchronously — mirroring the row-level lock Postgres
 * provides for `UPDATE ... WHERE team_member_paid = false`.
 */

const NYCMAID_TENANT = '00000000-0000-0000-0000-000000000001'
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

type Row = Record<string, unknown>
let frozenBookingSnapshot: Row
let claimed = false
const paymentInserts: Row[] = []
const payoutInserts: Row[] = []
const transfersCreated: Row[] = []

vi.mock('stripe', () => ({
  default: class MockStripe {
    transfers = {
      create: async (p: Row) => { transfersCreated.push(p); return { id: `tr_${transfersCreated.length}` } },
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
    let insertPayload: Row | null = null
    let isConditionalClaim = false
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { didUpdate = true; updatePayload = p; return c },
      insert: (p: Row) => { insertPayload = p; return c },
      eq: () => c,
      or: () => { isConditionalClaim = true; return c },
      single: async () => {
        if (table === 'payments' && insertPayload) {
          paymentInserts.push({ ...insertPayload })
          return { data: { id: `payment-${paymentInserts.length}` }, error: null }
        }
        if (table === 'team_member_payouts' && insertPayload) {
          payoutInserts.push({ ...insertPayload })
          return { data: { id: `payout-${payoutInserts.length}` }, error: null }
        }
        // Both calls' top-of-function booking fetch sees the SAME frozen
        // pre-race snapshot — neither has committed yet at this point.
        if (table === 'bookings' && !didUpdate) return { data: frozenBookingSnapshot, error: null }
        if (table === 'tenants') return { data: { id: NYCMAID_TENANT, name: 'T', stripe_api_key: null, telnyx_api_key: null, telnyx_phone: null }, error: null }
        if (table === 'clients') return { data: { phone: null }, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (table === 'payments') return res({ data: [], error: null })
        if (didUpdate && table === 'bookings' && isConditionalClaim) {
          // Synchronous check-and-set — the atomicity Postgres row locking
          // provides for `UPDATE ... WHERE team_member_paid = false`.
          if (claimed) return res({ data: [], error: null })
          claimed = true
          return res({ data: [{ id: BOOKING_ID }], error: null })
        }
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

beforeEach(() => {
  claimed = false
  paymentInserts.length = 0
  payoutInserts.length = 0
  transfersCreated.length = 0
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
  frozenBookingSnapshot = {
    id: BOOKING_ID,
    tenant_id: NYCMAID_TENANT,
    team_member_id: 'tm-1',
    client_id: 'c-1',
    team_member_pay: 5000,
    team_member_paid: false,
    actual_hours: 2,
    hourly_rate: 69,
    pay_rate: 25,
    price: null,
    check_in_time: null,
    start_time: '2026-08-14T18:00:00Z',
    clients: { name: 'Client', phone: null, address: null },
    team_members: {
      name: 'Worker', phone: null, sms_consent: false,
      stripe_account_id: 'acct_1', hourly_rate: null, pay_rate: 25, preferred_language: 'en',
    },
  }
})

describe('processPayment — genuinely concurrent double-payout race', () => {
  it('two in-flight calls for the same booking under different reference_ids fire only ONE real transfer', async () => {
    const callA = processPayment({
      tenant: { id: NYCMAID_TENANT },
      bookingId: BOOKING_ID,
      clientId: 'c-1',
      method: 'zelle',
      amountCents: 20_700,
      referenceId: 'zelle-ref-A',
    })
    const callB = processPayment({
      tenant: { id: NYCMAID_TENANT },
      bookingId: BOOKING_ID,
      clientId: 'c-1',
      method: 'zelle',
      amountCents: 20_700,
      referenceId: 'zelle-ref-B',
    })

    const [resultA, resultB] = await Promise.all([callA, callB])

    // Both resolve "paid" (each is a legitimate payment record), but only
    // ONE real Stripe transfer/payout may ever fire for the pair.
    expect(resultA?.status).toBe('paid')
    expect(resultB?.status).toBe('paid')
    expect(transfersCreated).toHaveLength(1)
    expect(payoutInserts).toHaveLength(1)

    const cleanerPaidTotal = (resultA?.cleanerPaidCents || 0) + (resultB?.cleanerPaidCents || 0)
    expect(cleanerPaidTotal).toBeGreaterThan(0)
    expect([resultA?.cleanerPaidCents, resultB?.cleanerPaidCents].sort()).toEqual([0, cleanerPaidTotal])
  })
})
