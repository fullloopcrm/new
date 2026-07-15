/**
 * quotes/public/[token]/deposit-checkout/route.ts — missing rate limiting.
 *
 * Public, unauthenticated endpoint that creates a real Stripe Checkout
 * Session (a paid API call) on every POST. Without a limit, a single valid
 * public_token could be replayed to spam Stripe session creation. Mirrors
 * invoices/public/[token]/checkout.
 */
import { describe, it, expect, vi } from 'vitest'

const rateLimitDb = vi.hoisted(() => vi.fn())
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (s: string) => `dec:${s}` }))
vi.mock('@/lib/quote', () => ({ logQuoteEvent: vi.fn(async () => {}) }))

const stripeSessionsCreate = vi.hoisted(() => vi.fn(async () => ({ id: 'cs_test', url: 'https://stripe.test/cs_test' })))
vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { create: stripeSessionsCreate } }
  },
}))

const maybeSingle = vi.hoisted(() => vi.fn(async () => ({
  data: {
    id: 'quote-1',
    tenant_id: 'tenant-1',
    quote_number: 'Q-1',
    title: 'Proposal',
    status: 'sent',
    contact_email: null,
    deposit_cents: 5000,
    deposit_paid_cents: 0,
    tenants: { name: 'Acme', domain: null, stripe_api_key: 'enc-key', stripe_account_id: 'acct_1' },
  },
  error: null,
})))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  },
}))

import { POST } from './route'

function checkoutReq(): Request {
  return { headers: new Headers() } as unknown as Request
}

const params = { params: Promise.resolve({ token: 'tok-xyz' }) }

describe('POST /api/quotes/public/[token]/deposit-checkout — rate limiting', () => {
  it('is rate-limited per-token and rejects (no Stripe session created) once the bucket is exhausted', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(checkoutReq(), params)
    expect(res.status).toBe(429)
    expect(stripeSessionsCreate).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith('deposit-checkout:tok-xyz', 10, 10 * 60 * 1000)
  })

  it('allows the checkout through when under the limit', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 9 })
    const res = await POST(checkoutReq(), params)
    expect(res.status).toBe(200)
    expect(stripeSessionsCreate).toHaveBeenCalled()
  })
})
