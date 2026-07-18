/**
 * Sibling of the invoice checkout fix: a customer paying a proposal deposit
 * on a tenant with no Stripe key configured used to get a raw 500 with the
 * internal message "Tenant Stripe not configured". Fixed to a 400 with a
 * customer-facing message.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const supabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) },
}))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: vi.fn(() => 'sk_test_x') }))
vi.mock('@/lib/quote', () => ({ logQuoteEvent: vi.fn() }))
vi.mock('stripe', () => ({ default: vi.fn() }))

function fakeRequest(ip = '1.2.3.4') {
  return {
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? ip : null) },
  } as unknown as Request
}

beforeEach(() => {
  rateLimitDb.mockReset()
  supabaseFrom.mockReset()
  rateLimitDb.mockResolvedValue({ allowed: true, remaining: 9 })
})

describe('POST /api/quotes/public/[token]/deposit-checkout — no Stripe configured', () => {
  it('returns 400 with a customer-facing message instead of a raw 500', async () => {
    supabaseFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: 'q1',
              status: 'accepted',
              deposit_cents: 5000,
              deposit_paid_cents: 0,
              tenants: { name: 'Acme', domain: null, stripe_api_key: null, stripe_account_id: null },
            },
          }),
        }),
      }),
    })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).not.toMatch(/Tenant Stripe/i)
    expect(body.error).toMatch(/contact us/i)
  })
})
