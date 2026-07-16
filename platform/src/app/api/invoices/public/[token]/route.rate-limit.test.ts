/**
 * GET /api/invoices/public/[token] is unauthenticated (token-auth) and, on
 * every call, bumps view_count/last_viewed_at and inserts an invoice_events
 * row -- had no rate limiting at all. Fixed with the same rateLimitDb
 * bucket pattern used on the sibling public quote view route.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const supabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) },
}))
vi.mock('@/lib/invoice', () => ({ logInvoiceEvent: vi.fn() }))

function fakeRequest(ip = '1.2.3.4') {
  return {
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? ip : null) },
    url: 'https://example.com/api/invoices/public/tok123',
  } as unknown as Request
}

beforeEach(() => {
  rateLimitDb.mockReset()
  supabaseFrom.mockReset()
})

describe('GET /api/invoices/public/[token] — rate limiting', () => {
  it('rejects with 429 once the per-IP bucket is exhausted, before touching the DB', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    const { GET } = await import('./route')
    const res = await GET(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(429)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith(
      expect.stringContaining('invoice-public:1.2.3.4'),
      30,
      60 * 1000
    )
  })

  it('passes through to the DB lookup when under the limit', async () => {
    rateLimitDb.mockResolvedValue({ allowed: true, remaining: 29 })
    supabaseFrom.mockReturnValue({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
    })
    const { GET } = await import('./route')
    const res = await GET(fakeRequest(), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(404)
    expect(supabaseFrom).toHaveBeenCalledWith('invoices')
  })
})
