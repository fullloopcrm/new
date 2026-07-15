import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Public invoice pay — Stripe checkout session CREATE.
 *
 * The public token is the tenant-scoping mechanism: the invoice (and its tenant's
 * Stripe key) is resolved by `.eq('public_token', token)`. These tests assert the
 * happy path builds a session for the BALANCE due with metadata that carries the
 * owning tenant_id + invoice_id (so the webhook later credits the right tenant),
 * and that an unknown token 404s (you cannot mint a checkout for an invoice whose
 * token you don't hold) and a paid/void invoice is refused.
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], create: null as null | ((a: unknown) => unknown) }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('stripe', () => {
  class MockStripe {
    checkout = { sessions: { create: async (args: unknown) => holder.create!(args) } }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (s: string) => s }))
vi.mock('@/lib/invoice', () => ({ logInvoiceEvent: vi.fn(async () => {}) }))

import { POST } from './route'

const A = 'tid-a'

function seed() {
  return {
    invoices: [
      {
        id: 'inv-a', tenant_id: A, public_token: 'tok-a', status: 'sent',
        total_cents: 15000, amount_paid_cents: 5000, contact_email: 'payer@x.com',
        invoice_number: 'INV-1', title: 'Deep clean',
        tenants: { name: 'Acme', domain: 'acme.test', stripe_api_key: 'sk_live_a', stripe_account_id: 'acct_a' },
      },
    ],
  }
}

let h: Harness
let created: Array<Record<string, any>>
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  created = []
  holder.create = (args) => {
    created.push(args as Record<string, any>)
    return { id: 'cs_new', url: 'https://stripe/cs_new' }
  }
})

function post(token: string) {
  return POST(new Request('http://t/api/invoices/public/x/checkout', { method: 'POST' }), {
    params: Promise.resolve({ token }),
  })
}

describe('invoices/public/[token]/checkout POST', () => {
  it('positive control: builds a balance-due session scoped to the owning tenant', async () => {
    const res = await post('tok-a')
    expect(res.status).toBe(200)
    expect((await res.json()).url).toBe('https://stripe/cs_new')
    expect(created).toHaveLength(1)
    // Balance = total 15000 − paid 5000.
    expect(created[0].line_items[0].price_data.unit_amount).toBe(10000)
    // Metadata carries the owning tenant so the webhook credits the right tenant.
    expect(created[0].metadata).toMatchObject({ invoice_id: 'inv-a', tenant_id: A })
    expect(created[0].payment_intent_data.metadata).toMatchObject({ invoice_id: 'inv-a', tenant_id: A })
  })

  it('unknown token 404s — no session is created', async () => {
    const res = await post('tok-nope')
    expect(res.status).toBe(404)
    expect(created).toHaveLength(0)
  })

  it('a paid invoice is refused (400) — no session is created', async () => {
    h.seed.invoices[0].status = 'paid'
    const res = await post('tok-a')
    expect(res.status).toBe(400)
    expect(created).toHaveLength(0)
  })
})
