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
import { makeSupabaseFake } from '@/test/supabase-fake'

// ── shared mutable store, hoisted so vi.mock factories can reach it ──
const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  // Set only by the from_booking_id race test below: simulates a concurrent
  // claim (a double-click retry, or the monthly cron) landing on the target
  // booking in the real gap between this route's own invoice INSERT and its
  // bookings.invoice_id UPDATE.
  raceClaimBookingId: null as string | null,
}))

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

// ── module mocks ──
// insertDefaults mirrors the old fake's created_at default; afterInsert emulates
// the DB trigger that recomputes an invoice when a payment row lands.
vi.mock('@/lib/supabase', () => {
  const opts = {
    insertDefaults: { created_at: '2026-07-12T00:00:00.000Z' },
    afterInsert: (row: Record<string, unknown>, table: string) => {
      if (table === 'payments') applyPaymentTrigger(row)
      if (table === 'invoices' && h.raceClaimBookingId) {
        const b = (h.store.bookings || []).find((x) => x.id === h.raceClaimBookingId)
        if (b) b.invoice_id = 'concurrent-invoice'
      }
    },
  }
  return { supabaseAdmin: makeSupabaseFake(h, opts), supabase: makeSupabaseFake(h, opts) }
})
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
  h.raceClaimBookingId = null
  h.store = {
    invoices: [
      // a pre-existing draft owned by ANOTHER tenant — must stay untouched.
      { id: 'inv-other', tenant_id: OTHER, status: 'draft', total_cents: 5000, amount_paid_cents: 0, invoice_number: 'INV-209901-0001' },
    ],
    invoice_activity: [],
    payments: [],
    clients: [{ id: 'client-A', tenant_id: TENANT, name: 'Jane Doe' }],
    entities: [{ id: 'ent-1', tenant_id: TENANT, name: 'Acme Co' }],
    bookings: [
      { id: 'booking-1', tenant_id: TENANT, invoice_id: null, price: 9000, service_type: 'Cleaning' },
      { id: 'booking-already-invoiced', tenant_id: TENANT, invoice_id: 'inv-existing', price: 7000, service_type: 'Cleaning' },
    ],
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

describe('CREATE from_booking_id: cannot double-bill the same visit (P1/W1 TOCTOU audit)', () => {
  it('rejects creating a second invoice for a booking that is already invoiced', async () => {
    const res = await createInvoice(
      jsonReq('http://acme.example.com/api/invoices', { booking_id: 'booking-already-invoiced' }),
    )
    expect(res.status).toBe(409)
    // no new invoice was created for the already-billed booking
    expect(h.store.invoices.some((i) => i.booking_id === 'booking-already-invoiced')).toBe(false)
  })

  it('claims the booking atomically: invoice_id is set to the new invoice', async () => {
    const res = await createInvoice(
      jsonReq('http://acme.example.com/api/invoices', { booking_id: 'booking-1' }),
    )
    expect(res.status).toBe(200)
    const inv = (await res.json()).invoice as Record<string, unknown>
    expect(h.store.bookings.find((b) => b.id === 'booking-1')?.invoice_id).toBe(inv.id)
  })

  it('rolls back the invoice instead of double-billing when a concurrent claim wins the race', async () => {
    // Simulates a double-click / retried request (or the monthly cron) claiming
    // booking-1 in the real gap between this route's own invoice INSERT and its
    // bookings.invoice_id UPDATE. Pre-fix this silently overwrote the concurrent
    // claim with a blind, unconditional update -- two invoices would both carry
    // the visit, with no trace of which one "really" owns it.
    h.raceClaimBookingId = 'booking-1'

    const res = await createInvoice(
      jsonReq('http://acme.example.com/api/invoices', { booking_id: 'booking-1' }),
    )

    expect(res.status).toBe(409)
    // the invoice this request created was rolled back, not left as a ghost draft
    expect(h.store.invoices.some((i) => i.booking_id === 'booking-1')).toBe(false)
    // booking-1 stays claimed by the concurrent invoice, not overwritten back
    expect(h.store.bookings.find((b) => b.id === 'booking-1')?.invoice_id).toBe('concurrent-invoice')
  })
})
