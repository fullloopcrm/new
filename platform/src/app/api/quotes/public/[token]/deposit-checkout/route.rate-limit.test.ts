import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/quotes/public/[token]/deposit-checkout mints a brand-new Stripe
 * Checkout Session on every call with no idempotency key -- a looping caller
 * (bot, retry storm, or a hostile actor with just the public link) can flood
 * the tenant's own Stripe account with live sessions with no other cap. Now
 * capped at 10 requests / 10 minutes per public token (same rateLimitDb
 * convention used elsewhere in this branch).
 */

const { rateLimitAllowed, createSession } = vi.hoisted(() => ({
  rateLimitAllowed: { value: true },
  createSession: vi.fn(async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.test/cs_test_1' })),
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: rateLimitAllowed.value, remaining: rateLimitAllowed.value ? 1 : 0 }),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({
          data: {
            id: 'quote-A',
            tenant_id: 'tenant-A',
            quote_number: 'Q-1',
            status: 'accepted',
            contact_email: 'buyer@example.com',
            deposit_cents: 5000,
            deposit_paid_cents: 0,
            tenants: { name: 'Sparkle Co', domain: 'sparkle.example', stripe_api_key: 'sk_live_A', stripe_account_id: 'acct_A' },
          },
          error: null,
        }),
      }
      return chain
    },
  },
}))

vi.mock('stripe', () => {
  class MockStripe {
    checkout = { sessions: { create: createSession } }
  }
  return { default: MockStripe }
})

vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))
vi.mock('@/lib/quote', () => ({ logQuoteEvent: async () => {} }))

import { POST } from './route'

function req() {
  return new Request('https://sparkle.example/api/quotes/public/tok_A/deposit-checkout', { method: 'POST' })
}
const ctx = { params: Promise.resolve({ token: 'tok_A' }) }

describe('POST /api/quotes/public/[token]/deposit-checkout — rate limit', () => {
  it('429s once the per-token rate limit is exhausted, without minting a Stripe session', async () => {
    rateLimitAllowed.value = false
    const res = await POST(req(), ctx)
    expect(res.status).toBe(429)
    expect(createSession).not.toHaveBeenCalled()
  })

  it('allows a normal request through', async () => {
    rateLimitAllowed.value = true
    const res = await POST(req(), ctx)
    expect(res.status).toBe(200)
  })
})
