import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Regression: processPayment() summed prior `payments` rows then INSERTed a
 * new one with no DB constraint backing (tenant_id, booking_id, reference_id)
 * at all. Two concurrent calls with the SAME reference_id — a double-tapped
 * "check out" button (team-portal/checkout uses a deterministic
 * `cleaner-checkout-${bookingId}` reference), a client retry after a
 * timeout, or a redelivered /api/admin/payments/finalize-match request —
 * both read the same prior-payments sum before either INSERT commits, so
 * both succeed: double revenue posted to the ledger and a duplicate
 * team_member_payouts row (double labor cost posted), even though the
 * Stripe transfer itself is idempotency-keyed and doesn't double-move money.
 * The fix adds a partial unique index (2026_07_13_payments_reference_dedup_
 * PROPOSED.sql) and treats the resulting 23505 as an idempotent no-op.
 */

const NYCMAID_TENANT = '00000000-0000-0000-0000-000000000001'
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

type Row = Record<string, unknown>
let bookingRow: Row
const existingPaymentKeys = new Set<string>()
const paymentInserts: Row[] = []
const revenuePosts: Row[] = []
const payoutInserts: Row[] = []
const ledgerLaborPosts: Row[] = []
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
    let insertPayload: Row | null = null
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { didUpdate = true; updatePayload = p; return c },
      insert: (p: Row) => { insertPayload = p; return c },
      eq: () => c,
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
        if (didUpdate && table === 'bookings') { return { data: null, error: null } }
        if (table === 'bookings') return { data: bookingRow, error: null }
        if (table === 'tenants') return { data: { id: bookingRow.tenant_id, name: 'T', stripe_api_key: null, telnyx_api_key: null, telnyx_phone: null }, error: null }
        if (table === 'clients') return { data: { phone: null }, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        // Prior-payments sum read (payments.select without .single()) — always
        // reflects only what's already committed, matching real Postgres
        // read-committed semantics for the race we're proving.
        if (table === 'payments') {
          return res({ data: paymentInserts.map((p) => ({ amount_cents: p.amount_cents })), error: null })
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
vi.mock('./finance/post-revenue', () => ({ postPaymentRevenue: async (p: Row) => { revenuePosts.push(p) } }))
vi.mock('./finance/post-labor', () => ({ postPayoutToLedger: async (p: Row) => { ledgerLaborPosts.push(p) } }))

import { processPayment } from './payment-processor'

function baseBooking(over: Row = {}): Row {
  return {
    id: BOOKING_ID,
    tenant_id: NYCMAID_TENANT,
    team_member_id: 'tm-1',
    client_id: 'c-1',
    team_member_pay: 5000,
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
  revenuePosts.length = 0
  payoutInserts.length = 0
  ledgerLaborPosts.length = 0
  transfersCreated.length = 0
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
  bookingRow = baseBooking()
})

describe('processPayment — duplicate reference_id race', () => {
  it('a second call with the SAME reference_id does not double-post revenue or the cleaner payout', async () => {
    const call = () => processPayment({
      tenant: { id: NYCMAID_TENANT },
      bookingId: BOOKING_ID,
      clientId: 'c-1',
      method: 'zelle',
      amountCents: 20_700,
      referenceId: 'cleaner-checkout-bbbbbbbb',
    })

    const first = await call()
    const second = await call()

    expect(first?.status).toBe('paid')
    expect(second?.status).toBe('paid')

    // Only ONE payments row, ONE revenue post, ONE payout row, ONE ledger
    // labor post — regression: pre-fix this was 2 of each.
    expect(paymentInserts).toHaveLength(1)
    expect(revenuePosts).toHaveLength(1)
    expect(payoutInserts).toHaveLength(1)
    expect(ledgerLaborPosts).toHaveLength(1)
    // The Stripe transfer call itself is idempotency-keyed (pre-existing
    // fix), so even an unmocked-Stripe double-call wouldn't double-move
    // money — but processPayment should not even attempt a second transfer.
    expect(transfersCreated).toHaveLength(1)
  })

  it('the duplicate call reports cleanerPaidCents: 0 (no new payout attributed to it)', async () => {
    const call = () => processPayment({
      tenant: { id: NYCMAID_TENANT },
      bookingId: BOOKING_ID,
      clientId: 'c-1',
      method: 'zelle',
      amountCents: 20_700,
      referenceId: 'ref-dup',
    })

    await call()
    const second = await call()
    expect(second?.cleanerPaidCents).toBe(0)
  })

  it('a DIFFERENT reference_id for the same booking is a legitimate second payment, not deduped', async () => {
    const first = await processPayment({
      tenant: { id: NYCMAID_TENANT },
      bookingId: BOOKING_ID,
      clientId: 'c-1',
      method: 'zelle',
      amountCents: 10_000,
      referenceId: 'ref-A',
    })
    const second = await processPayment({
      tenant: { id: NYCMAID_TENANT },
      bookingId: BOOKING_ID,
      clientId: 'c-1',
      method: 'zelle',
      amountCents: 10_700,
      referenceId: 'ref-B',
    })

    expect(first?.status).toBe('partial')
    expect(second?.status).toBe('paid')
    expect(paymentInserts).toHaveLength(2)
  })
})
