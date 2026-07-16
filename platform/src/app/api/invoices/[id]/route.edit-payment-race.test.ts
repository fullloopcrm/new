/**
 * PATCH /api/invoices/[id] — TOCTOU race with a concurrently-recorded
 * payment.
 *
 * The route's editable-status guard reads `status` once, then unconditionally
 * UPDATEs title/line_items/totals/etc. with no re-check in the UPDATE's own
 * WHERE clause. If a payment lands (via POST .../record-payment, or the
 * Stripe webhook) between that read and the write — the trigger in
 * 027_invoices.sql has already bumped status to 'partial'/'paid' by then —
 * the blind UPDATE still overwrites the invoice's fields against a now-stale
 * snapshot, silently drifting the recorded total away from what was actually
 * charged on a paid invoice.
 *
 * FIX: the UPDATE's WHERE clause now re-asserts status IN the editable set
 * against the CURRENT DB row, not the stale `existing` snapshot. If a
 * payment won the race, the UPDATE matches zero rows and the route returns
 * 409 instead of silently editing a paid invoice.
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

import { PATCH } from './route'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
})

describe('PATCH /api/invoices/[id] — concurrent-payment race', () => {
  it('refuses to edit once a payment has landed concurrently, instead of overwriting the paid invoice', async () => {
    h.store = {
      invoices: [{ id: INVOICE_ID, tenant_id: TENANT_ID, status: 'sent', amount_paid_cents: 0, total_cents: 10000, title: 'Original title' }],
    }

    // Simulate a payment landing (and the 027_invoices.sql trigger firing)
    // in the exact window between the route's own initial SELECT and its
    // later UPDATE.
    afterInitialRead.fn = () => {
      h.store.invoices[0].amount_paid_cents = 10000
      h.store.invoices[0].status = 'paid'
    }

    const res = await PATCH(patchReq({ title: 'Edited after the fact' }), params(INVOICE_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    // Title must still reflect the original — not silently overwritten on a
    // now-paid invoice.
    expect(h.store.invoices[0].title).toBe('Original title')
    expect(h.store.invoices[0].status).toBe('paid')
  })

  it('still edits a genuinely editable invoice (no regression on the non-race path)', async () => {
    h.store = {
      invoices: [{ id: INVOICE_ID, tenant_id: TENANT_ID, status: 'sent', amount_paid_cents: 0, total_cents: 10000, title: 'Original title' }],
    }

    const res = await PATCH(patchReq({ title: 'Edited normally' }), params(INVOICE_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.invoice.title).toBe('Edited normally')
    expect(h.store.invoices[0].title).toBe('Edited normally')
  })
})
