/**
 * POST /api/requests (public partnership-application form) had a per-email
 * 24h dedup check but no per-IP rate limiting -- a caller rotating emails
 * could still spam inserts + the admin notification email unbounded. Fixed
 * by adding the same rateLimitDb bucket pattern used on the other public
 * marketing-site forms this session.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const supabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) },
}))
vi.mock('@/lib/validate', () => ({ validate: vi.fn() }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn() }))

function fakeRequest(ip = '1.2.3.4') {
  return {
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? ip : null) },
    json: async () => ({}),
  } as unknown as import('next/server').NextRequest
}

beforeEach(() => {
  rateLimitDb.mockReset()
  supabaseFrom.mockReset()
})

describe('POST /api/requests — rate limiting', () => {
  it('rejects with 429 once the per-IP bucket is exhausted, before validating/inserting', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest())
    expect(res.status).toBe(429)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith(
      expect.stringContaining('requests-post:1.2.3.4'),
      10,
      60 * 1000
    )
  })

  it('passes through to validation when under the limit', async () => {
    rateLimitDb.mockResolvedValue({ allowed: true, remaining: 9 })
    const { validate } = await import('@/lib/validate')
    vi.mocked(validate).mockReturnValue({ data: null, error: 'business_name is required' })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest())
    expect(res.status).toBe(400)
  })
})
