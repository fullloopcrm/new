import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 checkout/payment HAPPY-PATH lock — customer pays an invoice via Stripe.
 *
 * Second angle to W2's webhook work (which locked the charge.refunded money
 * route). This drives the OTHER direction: a successful `checkout.session.completed`
 * for the invoice public-link path, end-to-end through the real route handler
 * against a stateful in-memory `payments` table, and asserts the persisted
 * state transition — not just HTTP 200.
 *
 * FLOW (session → webhook → state transition, tenant-scoped):
 *   A customer pays invoice INV for tenant-A on the hosted checkout page.
 *   Stripe delivers checkout.session.completed with
 *   metadata { invoice_id, tenant_id } and a payment_intent. The route:
 *     1. checks payments for an existing row on this session.id (idempotency),
 *     2. inserts ONE tenant-scoped payments row: tenant_id, invoice_id,
 *        amount_cents = session.amount_total, method 'stripe', status 'succeeded',
 *        stripe_session_id, stripe_payment_intent_id,
 *     3. posts that payment's revenue to the ledger (postPaymentRevenue).
 *
 * The assertions read the persisted row, so a regression that drops tenant_id,
 * writes the wrong amount/status, forgets the session id, or skips the revenue
 * post is caught.
 *
 * WHAT IS REAL vs MOCKED
 * ----------------------
 * REAL: the route handler and its invoice-path branch + idempotency guard.
 * MOCKED: the Stripe SDK (constructEvent echoes the hand-crafted event), the DB
 * (a stateful supabase store the payment lands in), and the ledger side-effects
 * (postPaymentRevenue asserted-called; the finance post-* imports stubbed so the
 * module resolves). Revenue MATH is locked separately at the lib level.
 */

const TENANT_A = 'aaaaaaaa-1111-2222-3333-444444444444'
const TENANT_B = 'bbbbbbbb-9999-8888-7777-666666666666'

// ── Stateful in-memory DB the payment actually lands in ──────────────────────
const h = vi.hoisted(() => {
  type Row = Record<string, any>
  const store: Record<string, Row[]> = { payments: [] }
  let idSeq = 0
  const genId = (table: string) => `${table}-${++idSeq}`
  const revenueCalls: Array<{ tenantId: string; paymentId: string }> = []
  return {
    store,
    revenueCalls,
    reset: () => {
      store.payments = []
      idSeq = 0
      revenueCalls.length = 0
    },
    postPaymentRevenue: vi.fn(async (o: { tenantId: string; paymentId: string }) => {
      revenueCalls.push(o)
      return { posted: true }
    }),
    chain: (table: string) => {
      const eqs: Row = {}
      let kind: 'read' | 'insert' | 'update' = 'read'
      let payload: Row | Row[] = {}
      let cap: number | null = null
      const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
      function doInsert(): Row[] {
        const rows = Array.isArray(payload) ? payload : [payload]
        const inserted = rows.map((r) => ({ id: r.id ?? genId(table), ...r }))
        store[table] = [...(store[table] || []), ...inserted]
        return inserted
      }
      // Mirrors migration 011's UNIQUE constraint on payments.stripe_session_id
      // -- the atomic-insert-as-claim money-race fix relies on a real 23505 to
      // detect a concurrent/retried delivery before any side effect.
      function checkUniqueSessionId(): { data: null; error: { code: string; message: string } } | null {
        if (table !== 'payments' || kind !== 'insert') return null
        const rows = Array.isArray(payload) ? payload : [payload]
        for (const p of rows) {
          if (p.stripe_session_id != null && (store.payments || []).some((r) => r.stripe_session_id === p.stripe_session_id)) {
            return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint on payments(stripe_session_id)' } }
          }
        }
        return null
      }
      function doUpdate() {
        store[table] = (store[table] || []).map((r) => (match(r) ? { ...r, ...(payload as Row) } : r))
      }
      const c: Record<string, unknown> = {
        select: () => c,
        insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
        update: (p: Row) => { kind = 'update'; payload = p; return c },
        eq: (col: string, val: unknown) => { eqs[col] = val; return c },
        order: () => c,
        limit: (n: number) => { cap = n; return c },
        single: async () => {
          if (kind === 'insert') {
            const dup = checkUniqueSessionId()
            if (dup) return dup
            const [row] = doInsert()
            return { data: row, error: null }
          }
          const found = (store[table] || []).find(match)
          return { data: found ?? null, error: found ? null : { message: 'not found' } }
        },
        maybeSingle: async () => ({ data: (store[table] || []).find(match) ?? null, error: null }),
        then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
          if (kind === 'insert') { doInsert(); return res({ data: null, error: null }) }
          if (kind === 'update') { doUpdate(); return res({ data: null, error: null }) }
          let rows = (store[table] || []).filter(match)
          if (cap != null) rows = rows.slice(0, cap)
          return res({ data: rows, error: null })
        },
      }
      return c
    },
  }
})

// Stripe SDK: constructEvent returns the parsed body so tests hand-craft events.
vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: (body: string) => JSON.parse(body) }
  }
  return { default: MockStripe }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => h.chain(t) } }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: h.postPaymentRevenue }))
// Finance post-* imports must resolve (route imports them at top); invoice path
// never calls them, so plain stubs suffice.
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/finance/post-adjustments', () => ({
  postDepositToLedger: vi.fn(async () => ({ posted: true })),
  postRefundToLedger: vi.fn(async () => ({ posted: true })),
  postChargebackToLedger: vi.fn(async () => ({ posted: true })),
  tenantFromPaymentIntent: vi.fn(async () => null),
}))

import { POST } from './route'

function invoicePaidEvent(opts: {
  sessionId: string
  tenantId: string
  invoiceId: string
  amountTotal: number
  paymentIntent?: string
}) {
  const session = {
    id: opts.sessionId,
    amount_total: opts.amountTotal,
    payment_intent: opts.paymentIntent ?? null,
    client_reference_id: null,
    customer_details: {},
    metadata: { invoice_id: opts.invoiceId, tenant_id: opts.tenantId },
  }
  return new Request('https://app.fullloop.example/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 'sig_test' },
    body: JSON.stringify({ type: 'checkout.session.completed', data: { object: session } }),
  })
}

beforeEach(() => {
  h.reset()
  h.postPaymentRevenue.mockClear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy'
})

describe('POST /api/webhooks/stripe checkout.session.completed — invoice paid → tenant-scoped payment + revenue', () => {
  it('inserts ONE succeeded payment row scoped to the paying tenant, then posts its revenue', async () => {
    const res = await POST(
      invoicePaidEvent({
        sessionId: 'cs_inv_1',
        tenantId: TENANT_A,
        invoiceId: 'inv-A',
        amountTotal: 24500,
        paymentIntent: 'pi_inv_1',
      }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ received: true, invoice_paid: true })

    // Exactly one payment row, carrying the correct tenant + invoice + money.
    expect(h.store.payments).toHaveLength(1)
    expect(h.store.payments[0]).toMatchObject({
      tenant_id: TENANT_A,
      invoice_id: 'inv-A',
      amount_cents: 24500,
      method: 'stripe',
      status: 'succeeded',
      stripe_session_id: 'cs_inv_1',
      stripe_payment_intent_id: 'pi_inv_1',
    })

    // Revenue posted for THIS payment, scoped to the paying tenant.
    expect(h.postPaymentRevenue).toHaveBeenCalledTimes(1)
    expect(h.revenueCalls[0]).toMatchObject({ tenantId: TENANT_A, paymentId: h.store.payments[0].id })
  })

  it('is idempotent on redelivery — the same session id writes no second payment and posts no second revenue', async () => {
    const make = () =>
      invoicePaidEvent({ sessionId: 'cs_inv_dup', tenantId: TENANT_A, invoiceId: 'inv-A', amountTotal: 10000, paymentIntent: 'pi_dup' })

    const first = await POST(make())
    expect(first.status).toBe(200)
    expect(h.store.payments).toHaveLength(1)

    const second = await POST(make())
    expect(second.status).toBe(200)
    expect(await second.json()).toMatchObject({ received: true, idempotent: true })

    // No duplicate row, no duplicate ledger post.
    expect(h.store.payments).toHaveLength(1)
    expect(h.postPaymentRevenue).toHaveBeenCalledTimes(1)
  })

  it('keeps two tenants isolated — each invoice payment lands under its own tenant_id, no bleed', async () => {
    await POST(invoicePaidEvent({ sessionId: 'cs_A', tenantId: TENANT_A, invoiceId: 'inv-A', amountTotal: 5000, paymentIntent: 'pi_A' }))
    await POST(invoicePaidEvent({ sessionId: 'cs_B', tenantId: TENANT_B, invoiceId: 'inv-B', amountTotal: 7000, paymentIntent: 'pi_B' }))

    expect(h.store.payments).toHaveLength(2)
    const a = h.store.payments.find((p) => p.stripe_session_id === 'cs_A')
    const b = h.store.payments.find((p) => p.stripe_session_id === 'cs_B')
    expect(a).toMatchObject({ tenant_id: TENANT_A, invoice_id: 'inv-A', amount_cents: 5000 })
    expect(b).toMatchObject({ tenant_id: TENANT_B, invoice_id: 'inv-B', amount_cents: 7000 })
    // No row carries a tenant it did not belong to.
    expect(h.store.payments.every((p) => p.tenant_id === TENANT_A || p.tenant_id === TENANT_B)).toBe(true)
    expect(h.revenueCalls.map((r) => r.tenantId).sort()).toEqual([TENANT_A, TENANT_B].sort())
  })
})
