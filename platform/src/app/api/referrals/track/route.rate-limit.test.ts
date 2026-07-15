/**
 * referrals/track/route.ts — missing rate limiting.
 *
 * Public, unauthenticated endpoint that takes an arbitrary referral_code and
 * does an unbounded DB lookup, enabling referral-code enumeration — same
 * abuse class already fixed on the sibling public forms (inquiry, feedback,
 * leads).
 */
import { describe, it, expect, vi } from 'vitest'

const rateLimitDb = vi.hoisted(() => vi.fn())
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const single = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({ single }),
      }),
    }),
  },
}))

import { POST } from './route'

function trackReq(): Request {
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9' }),
    json: async () => ({ referral_code: 'ABC123' }),
  } as unknown as Request
}

describe('POST /api/referrals/track — rate limiting', () => {
  it('is rate-limited per-ip and rejects (no DB lookup) once the bucket is exhausted', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(trackReq())
    expect(res.status).toBe(429)
    expect(single).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith('referrals-track:203.0.113.9', 20, 10 * 60 * 1000)
  })

  it('allows the lookup through when under the limit', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 19 })
    single
      .mockResolvedValueOnce({ data: { id: 'ref-1', tenant_id: 'tenant-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'tenant-1', name: 'Acme', slug: 'acme' }, error: null })
    const res = await POST(trackReq())
    expect(res.status).toBe(200)
    expect(single).toHaveBeenCalled()
  })
})
