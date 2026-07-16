/**
 * POST /api/quotes/public/[token]/deposit-checkout is unauthenticated
 * (token-auth) and, on every call, creates a real Stripe Checkout Session
 * against the tenant's own connected account -- had no rate limiting at
 * all, so a scripted retry loop could spam a tenant's Stripe API quota /
 * dashboard. Fixed with the same rateLimitDb bucket pattern used elsewhere.
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
})

describe('POST /api/quotes/public/[token]/deposit-checkout — rate limiting', () => {
  it('rejects with 429 once the per-IP bucket is exhausted, before touching the DB/Stripe', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(429)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith(
      expect.stringContaining('quote-deposit-checkout:1.2.3.4'),
      10,
      60 * 1000
    )
  })

  it('passes through to the DB lookup when under the limit', async () => {
    rateLimitDb.mockResolvedValue({ allowed: true, remaining: 9 })
    supabaseFrom.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(404)
    expect(supabaseFrom).toHaveBeenCalledWith('quotes')
  })
})
