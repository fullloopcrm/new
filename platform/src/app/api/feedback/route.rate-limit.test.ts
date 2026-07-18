import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/feedback is the public, unauthenticated anonymous-feedback
 * widget — no auth, no tenant. Same missed class as inquiry/leads: every
 * comparable public form this session covers is rate-limited via
 * rateLimitDb, this one had zero cap, so a flood could both spam the admin
 * notification inbox and write unbounded platform_feedback rows. Fixed with
 * the same rateLimitDb(`feedback:${ip}`) bucket convention.
 */

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const sendEmail = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/email', () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args) }))

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

const supabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) },
}))

function fakeRequest(body: Record<string, unknown>, ip = '9.9.9.9') {
  return {
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? ip : null) },
    json: async () => body,
  } as unknown as Request
}

beforeEach(() => {
  rateLimitDb.mockReset()
  sendEmail.mockClear()
  supabaseFrom.mockReset()
  supabaseFrom.mockReturnValue({ insert: async () => ({ error: null }) })
})

describe('POST /api/feedback — rate limiting', () => {
  it('rejects with 429 once the per-IP bucket is exhausted, before touching the DB or sending email', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest({ message: 'this is a real feedback message', category: 'general' }))
    expect(res.status).toBe(429)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith('feedback:9.9.9.9', 5, 10 * 60 * 1000)
  })

  it('passes through and persists when under the limit', async () => {
    rateLimitDb.mockResolvedValue({ allowed: true, remaining: 4 })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest({ message: 'this is a real feedback message', category: 'general' }))
    expect(res.status).toBe(201)
    expect(supabaseFrom).toHaveBeenCalledWith('platform_feedback')
  })
})
