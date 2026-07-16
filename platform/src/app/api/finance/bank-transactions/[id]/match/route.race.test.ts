/**
 * POST /api/finance/bank-transactions/:id/match — duplicate-payment race.
 *
 * Same money-race class as record-payment/confirm-match (P1/W1 sweep). The
 * top-of-route guard (`txn.status === 'matched' || 'posted'` → 400) reads
 * bank_transactions ONCE and is never re-checked before the payments insert
 * or the final bank_transactions update. A double-tapped "Match" button, or
 * two staff independently matching the same bank row, both pass that read
 * before either write commits — landing two payments rows for one bank
 * inflow. The 027_invoices.sql trigger sums ALL succeeded payments per
 * invoice, so this doesn't just inflate finance/summary, it can flip an
 * invoice to 'paid' on only half the real money, or (booking branch) mark a
 * booking paid twice over.
 *
 * FIX: a static reference_id keyed on the bank_txn id (`bank-txn-match-${id}`)
 * — a bank_txn is ONE inflow event and should never match twice, unlike an
 * invoice which legitimately takes multiple distinct payments over time — so
 * a fixed key is safe here. Layer-1 SELECT-before-insert closes the common
 * sequential case; layer-2 catches 23505 from migration
 * 065_unique_payments_reference.sql's partial unique index on
 * payments(tenant_id, booking_id, reference_id) for the true concurrent case.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const TENANT_ID = 'tenant-bm'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))

import { POST } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
function matchReq(txnId: string, body: Record<string, unknown>) {
  return POST(new Request('http://t', { method: 'POST', body: JSON.stringify(body) }), params(txnId))
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    bank_transactions: [
      { id: 'txn-inflow', tenant_id: TENANT_ID, txn_date: '2026-07-01', description: 'deposit', amount_cents: 15000, status: 'unmatched', bank_account_id: 'acct-1' },
    ],
    invoices: [
      { id: 'inv-1', tenant_id: TENANT_ID, total_cents: 15000, amount_paid_cents: 0, status: 'sent', client_id: 'client-1', booking_id: 'book-1' },
    ],
    bookings: [
      { id: 'book-1', tenant_id: TENANT_ID, client_id: 'client-1', payment_status: 'unpaid' },
    ],
    payments: [],
  }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('concurrent "Match" for the same bank transaction — target_type=invoice', () => {
  it('lands exactly one payments row, not two', async () => {
    const body = { target_type: 'invoice', target_id: 'inv-1' }
    const [first, second] = await Promise.all([matchReq('txn-inflow', body), matchReq('txn-inflow', body)])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(h.store.payments).toHaveLength(1)
    expect(h.store.payments[0].reference_id).toBe('bank-txn-match-txn-inflow')

    const firstBody = await first.json()
    const secondBody = await second.json()
    const deduped = [firstBody, secondBody].filter((b) => b.deduped)
    expect(deduped).toHaveLength(1)
  })

  it('a normal single call still records the payment (no regression on the non-race path)', async () => {
    const res = await matchReq('txn-inflow', { target_type: 'invoice', target_id: 'inv-1' })
    expect(res.status).toBe(200)
    expect(h.store.payments).toHaveLength(1)
    expect(h.store.payments[0].amount_cents).toBe(15000)
    expect(h.store.payments[0].invoice_id).toBe('inv-1')

    const txn = h.store.bank_transactions.find((t) => t.id === 'txn-inflow')!
    expect(txn.status).toBe('matched')
  })
})

describe('concurrent "Match" for the same bank transaction — target_type=booking', () => {
  it('lands exactly one payments row, not two', async () => {
    const body = { target_type: 'booking', target_id: 'book-1' }
    const [first, second] = await Promise.all([matchReq('txn-inflow', body), matchReq('txn-inflow', body)])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(h.store.payments).toHaveLength(1)
    expect(h.store.payments[0].reference_id).toBe('bank-txn-match-txn-inflow')

    const booking = h.store.bookings.find((b) => b.id === 'book-1')!
    expect(booking.payment_status).toBe('paid')
  })
})
