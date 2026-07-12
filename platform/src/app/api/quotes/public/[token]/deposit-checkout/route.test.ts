import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Public proposal deposit pay — Stripe checkout session CREATE.
 *
 * The public token scopes the quote (and its tenant's Stripe key). Happy path
 * builds a session for the remaining deposit due with metadata carrying the
 * owning tenant_id + quote_id + quote_deposit flag (the webhook uses these to
 * stamp the deposit and close the deal to the RIGHT tenant). Unknown token 404s;
 * a declined/expired proposal or a fully-paid deposit is refused.
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
vi.mock('@/lib/quote', () => ({ logQuoteEvent: vi.fn(async () => {}) }))

import { POST } from './route'

const A = 'tid-a'

function seed() {
  return {
    quotes: [
      {
        id: 'q-a', tenant_id: A, public_token: 'tok-a', quote_number: 'Q-1', title: 'Reno',
        status: 'sent', contact_email: 'payer@x.com', deposit_cents: 20000, deposit_paid_cents: 5000,
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
    return { id: 'cs_dep', url: 'https://stripe/cs_dep' }
  }
})

function post(token: string) {
  return POST(new Request('http://t/api/quotes/public/x/deposit-checkout', { method: 'POST' }), {
    params: Promise.resolve({ token }),
  })
}

describe('quotes/public/[token]/deposit-checkout POST', () => {
  it('positive control: builds a remaining-deposit session scoped to the owning tenant', async () => {
    const res = await post('tok-a')
    expect(res.status).toBe(200)
    expect((await res.json()).url).toBe('https://stripe/cs_dep')
    expect(created).toHaveLength(1)
    // Deposit due = 20000 − 5000 already paid.
    expect(created[0].line_items[0].price_data.unit_amount).toBe(15000)
    expect(created[0].metadata).toMatchObject({ quote_id: 'q-a', tenant_id: A, quote_deposit: 'true' })
    expect(created[0].payment_intent_data.metadata).toMatchObject({ quote_id: 'q-a', tenant_id: A })
  })

  it('unknown token 404s — no session is created', async () => {
    const res = await post('tok-nope')
    expect(res.status).toBe(404)
    expect(created).toHaveLength(0)
  })

  it('no deposit due (already fully paid) is refused (400) — no session is created', async () => {
    h.seed.quotes[0].deposit_paid_cents = 20000
    const res = await post('tok-a')
    expect(res.status).toBe(400)
    expect(created).toHaveLength(0)
  })
})
