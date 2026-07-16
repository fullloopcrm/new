import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Regression: a booking already paid out to its team member could be paid
 * out a SECOND time by any processPayment() call that resolves to "paid"
 * under a DIFFERENT reference_id (a real duplicate Zelle payment reconciled
 * under two transaction refs, a redelivered finalize-match call with a new
 * ref, etc). The Stripe transfer idempotency key is scoped to
 * (bookingId, referenceId), so a distinct referenceId was never deduped —
 * and nothing checked booking.team_member_paid before transferring. Unlike
 * payment-processor.duplicate-reference.test.ts (same reference_id, mock
 * doesn't persist bookings.update), this test simulates a persisted booking
 * row across calls to prove the SECOND real transfer is now skipped.
 */

const NYCMAID_TENANT = '00000000-0000-0000-0000-000000000001'
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

type Row = Record<string, unknown>
let bookingRow: Row
const existingPaymentKeys = new Set<string>()
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
      // The atomic-claim UPDATE in payment-processor.ts chains .or(...) before
      // being awaited directly (see `then` below). Marking it lets `then`
      // decide win/lose against the currently-persisted bookingRow.team_member_paid,
      // mirroring Postgres row-lock semantics — this is the exact mechanism
      // under test: the SECOND call's claim must lose once the first
      // call's claim has already committed team_member_paid: true.
      or: () => { isConditionalClaim = true; return c },
      single: async () => {
        if (table === 'payments' && insertPayload) {
          const key = `${insertPayload.tenant_id}:${insertPayload.booking_id}:${insertPayload.reference_id}`
          if (existingPaymentKeys.has(key)) {
            return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
          }
          existingPaymentKeys.add(key)
          paymentInserts.push({ ...insertPayload })
          return { data: { id: `payment-${paymentInserts.length}` }, error: null }
        }
        if (table === 'team_member_payouts' && insertPayload) {
          payoutInserts.push({ ...insertPayload })
          return { data: { id: `payout-${payoutInserts.length}` }, error: null }
        }
        // Persist bookings.update() into bookingRow so a second
        // processPayment() call sees team_member_paid: true from the first.
        if (didUpdate && table === 'bookings') {
          bookingRow = { ...bookingRow, ...updatePayload }
          return { data: null, error: null }
        }
        if (table === 'bookings') return { data: bookingRow, error: null }
        if (table === 'tenants') return { data: { id: bookingRow.tenant_id, name: 'T', stripe_api_key: null, telnyx_api_key: null, telnyx_phone: null }, error: null }
        if (table === 'clients') return { data: { phone: null }, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (table === 'payments') {
          return res({ data: paymentInserts.map((p) => ({ amount_cents: p.amount_cents })), error: null })
        }
        // bookings.update(...).eq(...).eq(...) is awaited directly (no
        // .single()) in payment-processor.ts — persist it here too.
        if (didUpdate && table === 'bookings') {
          if (isConditionalClaim) {
            // Row-lock semantics: the claim only succeeds while
            // team_member_paid is still false/null at the moment it runs.
            if (bookingRow.team_member_paid) {
              return res({ data: [], error: null })
            }
            bookingRow = { ...bookingRow, ...updatePayload }
            return res({ data: [{ id: bookingRow.id }], error: null })
          }
          bookingRow = { ...bookingRow, ...updatePayload }
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

function baseBooking(over: Row = {}): Row {
  return {
    id: BOOKING_ID,
    tenant_id: NYCMAID_TENANT,
    team_member_id: 'tm-1',
    client_id: 'c-1',
    team_member_pay: null,
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
    ...over,
  }
}

beforeEach(() => {
  existingPaymentKeys.clear()
  paymentInserts.length = 0
  payoutInserts.length = 0
  transfersCreated.length = 0
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
  bookingRow = baseBooking()
})

describe('processPayment — duplicate real payment under a different reference_id', () => {
  it('does not re-transfer to the team member once team_member_paid is already true', async () => {
    const first = await processPayment({
      tenant: { id: NYCMAID_TENANT },
      bookingId: BOOKING_ID,
      clientId: 'c-1',
      method: 'zelle',
      amountCents: 20_700,
      referenceId: 'zelle-ref-A',
    })
    expect(first?.status).toBe('paid')
    expect(transfersCreated).toHaveLength(1)
    expect(payoutInserts).toHaveLength(1)
    expect(bookingRow.team_member_paid).toBe(true)

    // A second, genuinely distinct real payment for the SAME booking (e.g.
    // client accidentally double-paid, reconciled under a different Zelle
    // transaction ref) must still record as a payment/tip for accounting —
    // but must NOT trigger a second real Stripe transfer to the cleaner.
    const second = await processPayment({
      tenant: { id: NYCMAID_TENANT },
      bookingId: BOOKING_ID,
      clientId: 'c-1',
      method: 'zelle',
      amountCents: 20_700,
      referenceId: 'zelle-ref-B',
    })

    expect(second?.status).toBe('paid')
    expect(paymentInserts).toHaveLength(2)
    expect(transfersCreated).toHaveLength(1)
    expect(payoutInserts).toHaveLength(1)
    expect(second?.cleanerPaidCents).toBe(0)
  })
})
