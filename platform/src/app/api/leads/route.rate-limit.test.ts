/**
 * POST /api/leads (public onboarding lead-capture form) had zero rate
 * limiting -- unlike every sibling public marketing-site form (contact,
 * requests, waitlist, apply, apply-ceo, prospects, feedback) already
 * hardened this session. A caller could script unbounded inserts into
 * leads + the folded partner_requests row, plus trigger the admin
 * notification email, on every request. Fixed with the same per-IP
 * rateLimitDb bucket pattern used on /api/requests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const supabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) },
}))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }))

function fakeRequest(body: Record<string, unknown> = {}, ip = '1.2.3.4') {
  return {
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? ip : null) },
    json: async () => body,
  } as unknown as Request
}

beforeEach(() => {
  rateLimitDb.mockReset()
  supabaseFrom.mockReset()
})

describe('POST /api/leads — rate limiting', () => {
  it('rejects with 429 once the per-IP bucket is exhausted, before touching the DB', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest())
    expect(res.status).toBe(429)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith(
      expect.stringContaining('leads-post:1.2.3.4'),
      10,
      60 * 1000
    )
  })

  it('passes through to validation when under the limit', async () => {
    rateLimitDb.mockResolvedValue({ allowed: true, remaining: 9 })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest({}))
    expect(res.status).toBe(400)
    expect(supabaseFrom).not.toHaveBeenCalled()
  })
})
