/**
 * DELETE /api/invoices/[id] (void) — TOCTOU race with a concurrently-recorded
 * payment.
 *
 * The route's "cannot void an invoice with payments" guard reads
 * amount_paid_cents once, then unconditionally UPDATEs status to 'void' with
 * no re-check in the UPDATE's own WHERE clause. If a payment lands (via
 * POST .../record-payment, or the Stripe webhook) between that read and the
 * write — the DB trigger in 027_invoices.sql has already bumped
 * amount_paid_cents/status to 'partial'/'paid' by then — the blind UPDATE
 * overwrites status back to 'void', leaving a real payment recorded against
 * a "voided" invoice: money received, but reported as neither owed nor paid.
 *
 * FIX: the UPDATE's WHERE clause now re-asserts amount_paid_cents = 0 against
 * the CURRENT DB row, not the stale snapshot read earlier. If a payment won
 * the race, the UPDATE matches zero rows and the route returns 409 instead
 * of silently voiding a paid invoice.
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
 *  initial SELECT resolves — i.e. in the exact TOCTOU gap this fix closes. */
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

const delReq = () => new Request('http://x', { method: 'DELETE' })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
})

describe('DELETE /api/invoices/[id] (void) — concurrent-payment race', () => {
  it('refuses to void once a payment has landed concurrently, instead of overwriting the paid status', async () => {
    h.store = {
      invoices: [{ id: INVOICE_ID, tenant_id: TENANT_ID, status: 'sent', amount_paid_cents: 0, total_cents: 10000 }],
    }

    // Simulate a payment landing (and the 027_invoices.sql trigger firing)
    // in the exact window between the route's own initial SELECT and its
    // later UPDATE — the route reads `existing` once and this fires right
    // after that read resolves, before the UPDATE runs.
    afterInitialRead.fn = () => {
      h.store.invoices[0].amount_paid_cents = 5000
      h.store.invoices[0].status = 'partial'
    }

    const res = await DELETE(delReq(), params(INVOICE_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    // Status must still reflect the real, received payment — not silently
    // flipped to void.
    expect(h.store.invoices[0].status).toBe('partial')
    expect(h.store.invoices[0].amount_paid_cents).toBe(5000)
  })

  it('still voids a genuinely unpaid invoice (no regression on the non-race path)', async () => {
    h.store = {
      invoices: [{ id: INVOICE_ID, tenant_id: TENANT_ID, status: 'sent', amount_paid_cents: 0, total_cents: 10000 }],
    }

    const res = await DELETE(delReq(), params(INVOICE_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(h.store.invoices[0].status).toBe('void')
  })
})
