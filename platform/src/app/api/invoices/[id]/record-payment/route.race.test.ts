/**
 * POST /api/invoices/[id]/record-payment — duplicate manual-payment race.
 *
 * Unlike payment-processor.ts's processPayment() and the finance/mark-paid
 * fix (same session), this route inserted a payments row with ZERO
 * idempotency check — every call unconditionally inserts. A double-tapped
 * "Record" button firing in two tabs, or the same received Zelle/Venmo
 * notification recorded independently by two staff members, lands two rows.
 *
 * The trigger in 027_invoices.sql (trg_payments_recompute_invoice) sums ALL
 * succeeded/paid/completed payments for the invoice on every insert, so a
 * duplicate doesn't just inflate finance/summary like mark-paid's race — it
 * can flip the invoice to 'paid' while only half the money actually arrived.
 *
 * Can't reuse mark-paid's static per-booking reference_id key: invoices
 * legitimately take multiple distinct payments over time (staged/partial
 * payment plans), so a fixed key would silently no-op a genuine second
 * payment. The caller-supplied reference_id is also optional and null on
 * most manual entries, so migration 065_unique_payments_reference.sql's
 * partial unique index (excludes NULL) wouldn't back this route even once
 * applied. Fix: a short (20s) server-timestamp-windowed duplicate check —
 * catches near-simultaneous resubmissions of the SAME amount+method without
 * blocking a genuinely separate payment recorded minutes/days later.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const TENANT_ID = 'tenant-rp'
const INVOICE_ID = 'inv1'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))
vi.mock('@/lib/invoice', () => ({ logInvoiceEvent: vi.fn(() => Promise.resolve()) }))

import { POST } from './route'

function recordPaymentReq(body: Record<string, unknown>) {
  return POST(
    new Request('http://t', { method: 'POST', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: INVOICE_ID }) },
  )
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    invoices: [{
      id: INVOICE_ID, tenant_id: TENANT_ID, client_id: 'client-1', booking_id: 'bk1',
      total_cents: 20000, amount_paid_cents: 0, status: 'sent',
    }],
    payments: [],
  }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('concurrent "Record Payment" for the same invoice', () => {
  it('lands exactly one payments row, not two, for identical near-simultaneous submissions', async () => {
    const body = { amount_cents: 10000, method: 'zelle' }
    const [first, second] = await Promise.all([recordPaymentReq(body), recordPaymentReq(body)])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(h.store.payments).toHaveLength(1)

    const secondJson = await second.json()
    expect(secondJson.deduped).toBe(true)
  })

  it('a normal single call still records the payment (no regression on the non-race path)', async () => {
    const res = await recordPaymentReq({ amount_cents: 10000, method: 'zelle' })
    expect(res.status).toBe(200)
    expect(h.store.payments).toHaveLength(1)
    expect(h.store.payments[0].amount_cents).toBe(10000)
  })

  it('does NOT dedupe a genuinely separate payment (different amount) submitted right after', async () => {
    await recordPaymentReq({ amount_cents: 10000, method: 'zelle' })
    const second = await recordPaymentReq({ amount_cents: 5000, method: 'zelle' })

    expect(second.status).toBe(200)
    expect(h.store.payments).toHaveLength(2)
  })

  it('does NOT dedupe a same-amount payment recorded outside the dedup window', async () => {
    // Seed an existing payment whose created_at is well outside the 20s
    // dedup window — mirrors a genuine second $100 Zelle payment recorded
    // days later, not a resubmission of the first.
    h.store.payments.push({
      id: 'existing-old', tenant_id: TENANT_ID, invoice_id: INVOICE_ID,
      amount_cents: 10000, method: 'zelle', status: 'succeeded',
      created_at: '2020-01-01T00:00:00.000Z',
    })

    const res = await recordPaymentReq({ amount_cents: 10000, method: 'zelle' })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.deduped).toBeUndefined()
    expect(h.store.payments).toHaveLength(2)
  })
})
