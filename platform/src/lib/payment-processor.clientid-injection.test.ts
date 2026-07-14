import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * payment-processor.ts `processPayment` — clientId FK-injection witness.
 * `processPayment` used to trust `input.clientId` verbatim for the
 * `payments.client_id` insert and the client-confirmation SMS lookup.
 * `/api/admin/payments/finalize-match` is gated by a single internal API key
 * that is global across ALL tenants and passes a raw caller-supplied
 * `clientId` straight through — so a leaked/misused key (or a bug in an
 * automated reconciliation caller) could attribute a payment to an unowned
 * client, including one belonging to a different tenant. Fixed by deriving
 * `clientId` from the already tenant-scoped `booking.client_id` instead of
 * trusting the caller. This proves the forged id is now ignored.
 */

const NYCMAID_TENANT = '00000000-0000-0000-0000-000000000001'
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

type Row = Record<string, unknown>
let bookingRow: Row
const paymentInserts: Row[] = []

vi.mock('stripe', () => ({
  default: class MockStripe {
    transfers = {
      create: async (p: Row) => { void p; return { id: 'tr_1' } },
    }
    payouts = {
      create: async (p: Row) => { void p; return { id: 'po_1' } },
    }
  },
}))

vi.mock('./supabase', () => {
  function chain(table: string) {
    let didUpdate = false
    let insertPayload: Row | null = null
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { didUpdate = true; void p; return c },
      insert: (p: Row) => { insertPayload = p; return c },
      eq: () => c,
      single: async () => {
        if (table === 'payments' && insertPayload) {
          paymentInserts.push({ ...insertPayload })
          return { data: { id: `payment-${paymentInserts.length}` }, error: null }
        }
        if (table === 'team_member_payouts' && insertPayload) {
          return { data: { id: 'payout-1' }, error: null }
        }
        if (didUpdate && table === 'bookings') { return { data: null, error: null } }
        if (table === 'bookings') return { data: bookingRow, error: null }
        if (table === 'tenants') return { data: { id: bookingRow.tenant_id, name: 'T', stripe_api_key: null, telnyx_api_key: null, telnyx_phone: null }, error: null }
        if (table === 'clients') return { data: { phone: null }, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
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
vi.mock('./finance/post-revenue', () => ({ postPaymentRevenue: async () => {} }))
vi.mock('./finance/post-labor', () => ({ postPayoutToLedger: async () => {} }))

import { processPayment } from './payment-processor'

beforeEach(() => {
  paymentInserts.length = 0
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
  bookingRow = {
    id: BOOKING_ID,
    tenant_id: NYCMAID_TENANT,
    team_member_id: 'tm-1',
    client_id: 'client-1', // the booking's REAL, tenant-verified owner
    team_member_pay: 5000,
    actual_hours: null,
    hourly_rate: 69,
    pay_rate: 25,
    price: 5000,
    check_in_time: null,
    start_time: '2026-08-14T18:00:00Z',
    clients: { name: 'Client', phone: null, address: null },
    team_members: {
      name: 'Worker', phone: null, sms_consent: false,
      stripe_account_id: 'acct_1', hourly_rate: null, pay_rate: 25, preferred_language: 'en',
    },
  }
})

describe('processPayment — clientId FK-injection', () => {
  it('a forged clientId in the input never lands on the payments row — booking.client_id wins', async () => {
    const r = await processPayment({
      tenant: { id: NYCMAID_TENANT },
      bookingId: BOOKING_ID,
      clientId: 'client-FORGED', // attacker/bug-supplied, does not own this booking
      method: 'zelle',
      amountCents: 5000,
      referenceId: 'ref-forge-1',
    })

    expect(r?.status).toBe('paid')
    expect(paymentInserts).toHaveLength(1)
    expect(paymentInserts[0].client_id).toBe('client-1')
    expect(paymentInserts[0].client_id).not.toBe('client-FORGED')
  })
})
