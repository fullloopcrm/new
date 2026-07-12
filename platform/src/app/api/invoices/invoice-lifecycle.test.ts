/**
 * Happy-path lifecycle test: invoice create → send → pay → status=paid,
 * tenant-scoped, Stripe mocked (P1/W1 queue item b).
 *
 * Drives the REAL route handlers across the invoice lifecycle against one
 * shared in-memory Supabase fake (same pattern as
 * lead/lead-capture-attribution.test.ts), so tenant scoping shows up as real
 * row placement:
 *
 *   1. CREATE — POST /api/invoices persists a tenant-scoped `invoices` row at
 *      status='draft' with an INV-YYYYMM-NNNN number + a 'created' activity.
 *   2. SEND   — POST /api/invoices/[id]/send flips draft → 'sent' (email stubbed)
 *      and logs a 'sent' activity.
 *   3. PAY    — POST /api/webhooks/stripe (Stripe.constructEvent MOCKED) lands a
 *      `payments` row for the invoice; the DB trigger is emulated by the fake so
 *      the invoice recomputes to status='paid'.
 *   4. SCOPE  — a second tenant's draft invoice is never touched by any of the
 *      above.
 *
 * Stripe is fully mocked (no network, no real key). Email/SMS/secret-crypto and
 * the fire-and-forget revenue post are stubbed so the test isolates state.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── shared mutable store, hoisted so vi.mock factories can reach it ──
const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

type State = {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete'
  eqs: Record<string, unknown>
  gtes: Array<{ col: string; val: unknown }>
  lts: Array<{ col: string; val: unknown }>
  head: boolean
  payload: unknown
}

function matches(r: Record<string, unknown>, s: State): boolean {
  if (!Object.entries(s.eqs).every(([k, v]) => r[k] === v)) return false
  for (const g of s.gtes) if (!(String(r[g.col]) >= String(g.val))) return false
  for (const l of s.lts) if (!(String(r[l.col]) < String(l.val))) return false
  return true
}

// Emulates the DB trigger that recomputes an invoice when a payment lands.
function applyPaymentTrigger(payment: Record<string, unknown>) {
  const invId = payment.invoice_id
  if (!invId || (payment.status && payment.status !== 'succeeded')) return
  const inv = (h.store.invoices || []).find((r) => r.id === invId)
  if (!inv) return
  const paid = (Number(inv.amount_paid_cents) || 0) + (Number(payment.amount_cents) || 0)
  inv.amount_paid_cents = paid
  if (paid >= (Number(inv.total_cents) || 0)) {
    inv.status = 'paid'
    inv.paid_at = '2026-07-12T00:00:00.000Z'
  } else {
    inv.status = 'partial'
  }
}

function runQuery(state: State, terminal: 'single' | 'maybeSingle' | 'many') {
  const rows = h.store[state.table] || (h.store[state.table] = [])

  if (state.op === 'insert') {
    const payload = Array.isArray(state.payload) ? state.payload : [state.payload]
    const inserted = payload.map((p: Record<string, unknown>) => {
      const row: Record<string, unknown> = { created_at: '2026-07-12T00:00:00.000Z', ...p }
      if (row.id == null) {
        h.seq += 1
        row.id = `${state.table}-${h.seq}`
      }
      rows.push(row)
      if (state.table === 'payments') applyPaymentTrigger(row)
      return row
    })
    if (terminal === 'many') return { data: inserted, error: null }
    return { data: inserted[0] ?? null, error: null }
  }

  if (state.op === 'update') {
    for (const r of rows) if (matches(r, state)) Object.assign(r, state.payload as object)
    return { data: null, error: null }
  }

  const found = rows.filter((r) => matches(r, state))
  if (state.head) return { count: found.length, data: null, error: null }
  if (terminal === 'single') return { data: found[0] ?? null, error: found[0] ? null : { message: 'no rows' } }
  if (terminal === 'maybeSingle') return { data: found[0] ?? null, error: null }
  return { data: found, error: null }
}

function makeClient() {
  return {
    from(table: string) {
      const state: State = { table, op: 'select', eqs: {}, gtes: [], lts: [], head: false, payload: null }
      const chain: Record<string, unknown> = {
        select: (_cols?: unknown, opts?: { head?: boolean }) => { if (opts?.head) state.head = true; return chain },
        insert: (payload: unknown) => { state.op = 'insert'; state.payload = payload; return chain },
        update: (payload: unknown) => { state.op = 'update'; state.payload = payload; return chain },
        eq: (col: string, val: unknown) => { state.eqs[col] = val; return chain },
        gte: (col: string, val: unknown) => { state.gtes.push({ col, val }); return chain },
        lt: (col: string, val: unknown) => { state.lts.push({ col, val }); return chain },
        not: () => chain,
        order: () => chain,
        limit: () => chain,
        single: () => Promise.resolve(runQuery(state, 'single')),
        maybeSingle: () => Promise.resolve(runQuery(state, 'maybeSingle')),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(runQuery(state, 'many')).then(res, rej),
      }
      return chain
    },
  }
}

// ── module mocks ──
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeClient(), supabase: makeClient() }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (s: string) => `dec:${s}` }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => ({ ok: true }) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({ ok: true }) }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: async () => {} }))

// Stripe — no network, no real key. Only constructEvent is exercised here.
const stripeEvent = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('stripe', () => ({
  default: class {
    webhooks = { constructEvent: () => stripeEvent.current }
    checkout = { sessions: { create: async () => ({ id: 'cs_test', url: 'https://stripe.test/cs_test' }) } }
  },
}))

import { POST as createInvoice } from './route'
import { POST as sendInvoice } from './[id]/send/route'
import { POST as stripeWebhook } from '../webhooks/stripe/route'

const TENANT = 'tenant-A'
const OTHER = 'tenant-B'

const jsonReq = (url: string, body: unknown) =>
  new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  h.tenantId = TENANT
  h.seq = 0
  h.store = {
    invoices: [
      // a pre-existing draft owned by ANOTHER tenant — must stay untouched.
      { id: 'inv-other', tenant_id: OTHER, status: 'draft', total_cents: 5000, amount_paid_cents: 0, invoice_number: 'INV-209901-0001' },
    ],
    invoice_activity: [],
    payments: [],
    tenants: [
      {
        id: TENANT, name: 'Acme Co', slug: 'acme', domain: 'acme.example.com',
        resend_api_key: 'enc-resend', email_from: 'billing@acme.example.com',
        telnyx_api_key: null, telnyx_phone: null,
      },
    ],
  }
  stripeEvent.current = null
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'
})

async function createDraft() {
  const res = await createInvoice(
    jsonReq('http://acme.example.com/api/invoices', {
      entity_id: 'ent-1',
      client_id: 'client-A',
      contact_name: 'Jane Doe',
      contact_email: 'jane@x.com',
      line_items: [{ id: 'li1', name: 'Deep clean', quantity: 1, unit_price_cents: 12000 }],
    }),
  )
  expect(res.status).toBe(200)
  return (await res.json()).invoice as Record<string, unknown>
}

describe('invoice lifecycle: create → send → pay (happy path)', () => {
  it('CREATE: persists a tenant-scoped draft with a numbered invoice + activity', async () => {
    const inv = await createDraft()

    expect(inv.tenant_id).toBe(TENANT)
    expect(inv.status).toBe('draft')
    expect(inv.total_cents).toBe(12000)
    expect(String(inv.invoice_number)).toMatch(/^INV-\d{6}-0001$/)

    // only the tenant's invoice was added; the other tenant's stayed put
    expect(h.store.invoices.filter((r) => r.tenant_id === TENANT)).toHaveLength(1)
    expect(h.store.invoice_activity).toContainEqual(
      expect.objectContaining({ invoice_id: inv.id, tenant_id: TENANT, event_type: 'created' }),
    )
  })

  it('SEND: flips draft → sent and logs a sent activity', async () => {
    const inv = await createDraft()

    const res = await sendInvoice(
      jsonReq(`http://acme.example.com/api/invoices/${inv.id}/send`, { via: 'email', to_email: 'jane@x.com' }),
      { params: Promise.resolve({ id: String(inv.id) }) },
    )
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ ok: true, via: 'email' })

    const stored = h.store.invoices.find((r) => r.id === inv.id)!
    expect(stored.status).toBe('sent')
    expect(stored.sent_via).toBe('email')
    expect(h.store.invoice_activity).toContainEqual(
      expect.objectContaining({ invoice_id: inv.id, event_type: 'sent' }),
    )
  })

  it('PAY: a mocked Stripe checkout.session.completed drives the invoice to paid', async () => {
    const inv = await createDraft()

    stripeEvent.current = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_paid_1',
          amount_total: 12000,
          payment_intent: 'pi_1',
          metadata: { invoice_id: inv.id, tenant_id: TENANT, invoice_number: inv.invoice_number },
        },
      },
    }

    const res = await stripeWebhook(
      new Request('http://acme.example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=sig' },
        body: JSON.stringify({ id: 'evt_1' }),
      }),
    )
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ received: true, invoice_paid: true })

    // payment landed tenant-scoped via Stripe, invoice recomputed to paid
    expect(h.store.payments).toHaveLength(1)
    expect(h.store.payments[0]).toMatchObject({ tenant_id: TENANT, invoice_id: inv.id, method: 'stripe', amount_cents: 12000 })
    const stored = h.store.invoices.find((r) => r.id === inv.id)!
    expect(stored.status).toBe('paid')
    expect(stored.amount_paid_cents).toBe(12000)
  })

  it("end-to-end create → send → pay never touches another tenant's invoice", async () => {
    const inv = await createDraft()
    await sendInvoice(
      jsonReq(`http://acme.example.com/api/invoices/${inv.id}/send`, { via: 'email', to_email: 'jane@x.com' }),
      { params: Promise.resolve({ id: String(inv.id) }) },
    )
    stripeEvent.current = {
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_2', amount_total: 12000, payment_intent: 'pi_2', metadata: { invoice_id: inv.id, tenant_id: TENANT } } },
    }
    await stripeWebhook(
      new Request('http://acme.example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 't=1,v1=sig' },
        body: JSON.stringify({ id: 'evt_2' }),
      }),
    )

    const other = h.store.invoices.find((r) => r.id === 'inv-other')!
    expect(other.status).toBe('draft')
    expect(other.amount_paid_cents).toBe(0)
    expect(h.store.payments.every((p) => p.tenant_id === TENANT)).toBe(true)
  })
})
