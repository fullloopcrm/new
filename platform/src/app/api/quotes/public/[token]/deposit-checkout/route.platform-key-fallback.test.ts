/**
 * quotes/public/[token]/deposit-checkout/route.ts — no fallback to the
 * platform's shared Stripe key when the tenant has no stripe_api_key of
 * their own. Mirrors the invoices/public/[token]/checkout gap: quote
 * creation has zero dependency on Stripe being configured, so any tenant
 * relying on the platform default key had every public deposit "Pay Now"
 * link 500 instead of falling back like every sibling Stripe call site.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const rateLimitDb = vi.hoisted(() => vi.fn(async () => ({ allowed: true, remaining: 9 })))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (s: string) => `dec:${s}` }))
vi.mock('@/lib/quote', () => ({ logQuoteEvent: vi.fn(async () => {}) }))

const stripeSessionsCreate = vi.hoisted(() => vi.fn(async () => ({ id: 'cs_test', url: 'https://stripe.test/cs_test' })))
const stripeCtor = vi.hoisted(() => vi.fn())
vi.mock('stripe', () => ({
  default: class {
    constructor(...args: unknown[]) {
      stripeCtor(...args)
    }
    checkout = { sessions: { create: stripeSessionsCreate } }
  },
}))

const maybeSingle = vi.hoisted(() => vi.fn())
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

const quoteRow = (tenantOverrides: Record<string, unknown>) => ({
  id: 'quote-1',
  tenant_id: 'tenant-1',
  quote_number: 'Q-1',
  title: 'Proposal',
  status: 'sent',
  contact_email: null,
  deposit_cents: 5000,
  deposit_paid_cents: 0,
  tenants: { name: 'Acme', domain: null, stripe_api_key: null, stripe_account_id: null, ...tenantOverrides },
})

describe('POST /api/quotes/public/[token]/deposit-checkout — platform key fallback', () => {
  const originalEnvKey = process.env.STRIPE_SECRET_KEY

  beforeEach(() => {
    stripeCtor.mockClear()
    stripeSessionsCreate.mockClear()
  })

  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = originalEnvKey
  })

  it('falls back to the platform STRIPE_SECRET_KEY when the tenant has no key configured', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_platform_test'
    maybeSingle.mockResolvedValueOnce({ data: quoteRow({}), error: null })

    const res = await POST(checkoutReq(), params)

    expect(res.status).toBe(200)
    expect(stripeCtor).toHaveBeenCalledWith('sk_platform_test', expect.anything())
    expect(stripeSessionsCreate).toHaveBeenCalled()
  })

  it('still 500s cleanly when neither the tenant nor the platform has a key', async () => {
    delete process.env.STRIPE_SECRET_KEY
    maybeSingle.mockResolvedValueOnce({ data: quoteRow({}), error: null })

    const res = await POST(checkoutReq(), params)

    expect(res.status).toBe(500)
    expect(stripeSessionsCreate).not.toHaveBeenCalled()
  })

  it('still prefers the tenant key (decrypted) when one is configured', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_platform_test'
    maybeSingle.mockResolvedValueOnce({ data: quoteRow({ stripe_api_key: 'enc-tenant-key' }), error: null })

    const res = await POST(checkoutReq(), params)

    expect(res.status).toBe(200)
    expect(stripeCtor).toHaveBeenCalledWith('dec:enc-tenant-key', expect.anything())
  })
})
