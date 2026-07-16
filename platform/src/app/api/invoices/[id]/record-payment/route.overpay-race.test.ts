import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/invoices/[id]/record-payment checks the invoice's remaining
 * balance BEFORE inserting the new payment. Two near-simultaneous calls
 * (double-click on "Record Payment", a client retry) both read the same
 * stale amount_paid_cents, both pass the remaining-balance check, and both
 * insert — the DB trigger recomputes amount_paid_cents as a SUM of every
 * succeeded payment, so the invoice ends up overpaid (a manual Zelle/cash/
 * check payment recorded twice for money the tenant only actually received
 * once). Fixed by verifying after insert that the recomputed total didn't
 * exceed the invoice total, and rolling back this request's own payment if
 * it did.
 *
 * Race simulated the same way route.number-race.test.ts simulates a
 * concurrent invoice-number collision: inject the "other request's" insert
 * at the exact read -> write gap this request has no lock across, via a
 * hook fired the moment this request's pre-check read resolves.
 */

const invoicesStore = [{ id: 'inv-1', tenant_id: 'T', total_cents: 100000, amount_paid_cents: 90000, status: 'partial' }]
const paymentsStore: Array<{ id: string; invoice_id: string; amount_cents: number; status: string }> = []
let nextPaymentId = 1
let invoiceReadCount = 0
let raceHook: (() => void) | null = null

const { logInvoiceEvent } = vi.hoisted(() => ({ logInvoiceEvent: vi.fn(async () => {}) }))
vi.mock('@/lib/invoice', () => ({ logInvoiceEvent }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'T' }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: 'T' }),
  AuthError: class AuthError extends Error {},
}))

/** Recompute amount_paid_cents + status the same way the real 027_invoices.sql trigger does. */
function recomputeInvoice(invoiceId: string) {
  const inv = invoicesStore.find((i) => i.id === invoiceId)
  if (!inv) return
  const totalPaid = paymentsStore
    .filter((p) => p.invoice_id === invoiceId && p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount_cents, 0)
  inv.amount_paid_cents = totalPaid
  inv.status = totalPaid >= inv.total_cents ? 'paid' : totalPaid > 0 ? 'partial' : inv.status
}

vi.mock('@/lib/supabase', () => {
  function from(table: string) {
    const eqs: Record<string, unknown> = {}
    let insertRow: Record<string, unknown> | null = null
    let deleteMode = false
    const matchesInvoice = (row: (typeof invoicesStore)[number]) =>
      Object.entries(eqs).every(([k, v]) => (row as Record<string, unknown>)[k] === v)
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        eqs[col] = val
        // route.ts's delete() has no .single() chained — it's awaited right
        // after .eq(), so the delete must actually happen here, not in a
        // terminal method that's never called.
        if (deleteMode && table === 'payments') {
          const idx = paymentsStore.findIndex((p) => p.id === eqs.id)
          if (idx !== -1) {
            const [removed] = paymentsStore.splice(idx, 1)
            recomputeInvoice(removed.invoice_id)
          }
        }
        return chain
      },
      insert: (row: Record<string, unknown>) => {
        insertRow = row
        return chain
      },
      delete: () => {
        deleteMode = true
        return chain
      },
      single: async () => {
        if (table === 'payments' && insertRow) {
          const id = `pay-${nextPaymentId++}`
          const row = {
            id,
            invoice_id: insertRow.invoice_id as string,
            amount_cents: insertRow.amount_cents as number,
            status: insertRow.status as string,
          }
          paymentsStore.push(row)
          recomputeInvoice(row.invoice_id)
          return { data: { id }, error: null }
        }
        if (table === 'invoices') {
          invoiceReadCount++
          const row = invoicesStore.find(matchesInvoice)
          const snapshot = row ? { ...row } : null
          // Fire the "concurrent request landed" hook right after THIS
          // read resolves — models a second request's insert (and trigger
          // recompute) completing in the gap between this request's
          // pre-check read and its own insert.
          if (invoiceReadCount === 1 && raceHook) {
            const hook = raceHook
            raceHook = null
            hook()
          }
          return { data: snapshot, error: snapshot ? null : { message: 'not found' } }
        }
        return { data: null, error: { message: 'unhandled' } }
      },
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('https://app.fullloop.example/api/invoices/inv-1/record-payment', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
const params = { params: Promise.resolve({ id: 'inv-1' }) }

beforeEach(() => {
  invoicesStore[0].total_cents = 100000
  invoicesStore[0].amount_paid_cents = 90000
  invoicesStore[0].status = 'partial'
  paymentsStore.length = 0
  // amount_paid_cents is always derived from actual payment rows (same as
  // the real trigger) — seed a pre-existing 90000-cent payment so the
  // recompute-on-insert stays consistent with the invoice's starting balance.
  paymentsStore.push({ id: 'pay-existing', invoice_id: 'inv-1', amount_cents: 90000, status: 'succeeded' })
  nextPaymentId = 1
  invoiceReadCount = 0
  raceHook = null
  logInvoiceEvent.mockClear()
})

describe('POST /api/invoices/[id]/record-payment — overpay race', () => {
  it('records a normal payment within the remaining balance', async () => {
    const res = await POST(req({ amount_cents: 10000, method: 'zelle' }), params)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(invoicesStore[0].amount_paid_cents).toBe(100000)
    expect(invoicesStore[0].status).toBe('paid')
  })

  it('rolls back its own payment when a concurrent request pushes the invoice over its total', async () => {
    // This request reads amount_paid_cents=90000 (10000 remaining) and
    // decides an 8000-cent payment fits. Before it inserts, a concurrent
    // "other tab" request's own 8000-cent payment lands and commits —
    // neither request's pre-check ever saw the other's write.
    raceHook = () => {
      paymentsStore.push({ id: 'pay-concurrent', invoice_id: 'inv-1', amount_cents: 8000, status: 'succeeded' })
      recomputeInvoice('inv-1')
    }

    const res = await POST(req({ amount_cents: 8000, method: 'zelle' }), params)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/duplicate submission/i)
    // The concurrent request's payment (98000) is untouched; THIS request's
    // own payment was rolled back, not double-counted.
    expect(invoicesStore[0].amount_paid_cents).toBe(98000)
    expect(paymentsStore.map((p) => p.id).sort()).toEqual(['pay-concurrent', 'pay-existing'])
    // No "paid"/"partial_payment" event logged for the rolled-back payment.
    expect(logInvoiceEvent).not.toHaveBeenCalled()
  })

  it('still rejects up front when the balance was already stale before this request even read it', async () => {
    invoicesStore[0].amount_paid_cents = 100000
    invoicesStore[0].status = 'paid'
    const res = await POST(req({ amount_cents: 100, method: 'cash' }), params)
    expect(res.status).toBe(400)
  })
})
