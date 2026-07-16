/**
 * POST /api/quotes/public/[token]/accept is unauthenticated (token-auth),
 * mutates the quote to 'accepted', syncs the deal, and fires owner
 * email+SMS on every call -- had no rate limiting at all. A scripted retry
 * loop could spam a tenant's notification pipeline. Fixed with the same
 * rateLimitDb bucket pattern used elsewhere this session.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const supabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) },
}))
vi.mock('@/lib/quote', () => ({ logQuoteEvent: vi.fn() }))

function fakeRequest(body: Record<string, unknown>, ip = '1.2.3.4') {
  return {
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? ip : null) },
    json: async () => body,
  } as unknown as Request
}

beforeEach(() => {
  rateLimitDb.mockReset()
  supabaseFrom.mockReset()
})

describe('POST /api/quotes/public/[token]/accept — rate limiting', () => {
  it('rejects with 429 once the per-IP bucket is exhausted, before touching the DB', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest({}), { params: Promise.resolve({ token: 'tok123' }) })
    expect(res.status).toBe(429)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith(
      expect.stringContaining('quote-public-accept:1.2.3.4'),
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
    const res = await POST(
      fakeRequest({ signature_png: 'data:image/png;base64,' + 'a'.repeat(100), signature_name: 'Alex' }),
      { params: Promise.resolve({ token: 'tok123' }) }
    )
    expect(res.status).toBe(404)
    expect(supabaseFrom).toHaveBeenCalledWith('quotes')
  })
})
