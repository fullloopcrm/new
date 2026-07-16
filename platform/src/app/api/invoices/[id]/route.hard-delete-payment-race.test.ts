/**
 * DELETE /api/invoices/[id]?hard=1 — TOCTOU race with a concurrently-recorded
 * payment on a draft invoice.
 *
 * record-payment only blocks void/refunded invoices — a draft invoice can
 * receive a real payment. The hard-delete branch here read
 * amount_paid_cents once, then unconditionally DELETEd the invoice row with
 * no re-check in the DELETE's own WHERE clause. If a payment lands between
 * that read and the delete (the 027_invoices.sql trigger bumps
 * amount_paid_cents/status before this DELETE runs), the blind DELETE erases
 * the invoice: the payment row survives (invoice_id is ON DELETE SET NULL,
 * not CASCADE) but is orphaned, with no invoice left to explain what it was
 * for.
 *
 * FIX: the DELETE's WHERE clause now re-asserts amount_paid_cents = 0
 * against the CURRENT DB row. If a payment won the race, the DELETE matches
 * zero rows and the route returns 409 instead of silently destroying the
 * invoice record for a real payment.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const TENANT_ID = 'tenant-A'
const INVOICE_ID = 'inv-1'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

/** Set by a test to inject a concurrent write right after the route's own
 *  initial SELECT resolves — the exact TOCTOU gap this fix closes. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeSupabaseFake(h, { detachReads: true })
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'invoices') return chain
      const origSingle = chain.single as () => Promise<unknown>
      chain.single = () =>
        origSingle().then((res) => {
          afterInitialRead.fn?.()
          afterInitialRead.fn = null
          return res
        })
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/invoice', () => ({
  normalizeLineItems: (items: unknown) => items,
  computeTotals: () => ({ subtotal_cents: 0, tax_cents: 0, discount_cents: 0, total_cents: 0 }),
  logInvoiceEvent: vi.fn(async () => {}),
}))

import { DELETE } from './route'

const hardDelReq = () => new Request('http://x?hard=1', { method: 'DELETE' })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
})

describe('DELETE /api/invoices/[id]?hard=1 — concurrent-payment race', () => {
  it('refuses to hard-delete once a payment has landed concurrently, instead of erasing the invoice', async () => {
    h.store = {
      invoices: [{ id: INVOICE_ID, tenant_id: TENANT_ID, status: 'draft', amount_paid_cents: 0, total_cents: 10000 }],
      payments: [{ id: 'pay-1', invoice_id: INVOICE_ID, tenant_id: TENANT_ID, amount_cents: 5000 }],
    }

    // Simulate a payment landing (and the 027_invoices.sql trigger firing) in
    // the exact window between the route's own initial SELECT and the DELETE.
    afterInitialRead.fn = () => {
      h.store.invoices[0].amount_paid_cents = 5000
      h.store.invoices[0].status = 'partial'
    }

    const res = await DELETE(hardDelReq(), params(INVOICE_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    // The invoice must still exist — not silently erased out from under a
    // real payment.
    expect(h.store.invoices).toHaveLength(1)
    expect(h.store.invoices[0].status).toBe('partial')
  })

  it('still hard-deletes a genuinely unpaid draft invoice (no regression on the non-race path)', async () => {
    h.store = {
      invoices: [{ id: INVOICE_ID, tenant_id: TENANT_ID, status: 'draft', amount_paid_cents: 0, total_cents: 10000 }],
    }

    const res = await DELETE(hardDelReq(), params(INVOICE_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true, hard: true })
    expect(h.store.invoices).toHaveLength(0)
  })
})
