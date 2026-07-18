import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/leads is the public, unauthenticated lead-capture form on the
 * onboarding page — no auth, no tenant. Same missed class as inquiry/
 * feedback: every comparable public form this session covers is
 * rate-limited via rateLimitDb, this one had zero cap, so a flood could
 * spam the admin notification inbox and write unbounded leads/
 * partner_requests rows. Fixed with the same rateLimitDb(`leads:${ip}`)
 * bucket convention used by the tenant-scoped sibling /api/lead
 * (`lead:${tenantId}:${ip}`).
 */

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const sendEmail = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/email', () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args) }))

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

const VALID_BODY = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  business_name: 'Jane Cleaning Co',
}

beforeEach(() => {
  rateLimitDb.mockReset()
  sendEmail.mockClear()
  supabaseFrom.mockReset()
  supabaseFrom.mockReturnValue({
    insert: () => ({
      select: () => ({ single: async () => ({ data: { id: 'lead-1' }, error: null }) }),
      then: undefined,
    }),
  })
})

describe('POST /api/leads — rate limiting', () => {
  it('rejects with 429 once the per-IP bucket is exhausted, before touching the DB or sending email', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest(VALID_BODY))
    expect(res.status).toBe(429)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith('leads:9.9.9.9', 5, 10 * 60 * 1000)
  })

  it('passes through and persists when under the limit', async () => {
    rateLimitDb.mockResolvedValue({ allowed: true, remaining: 4 })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest(VALID_BODY))
    expect(res.status).toBe(200)
    expect(supabaseFrom).toHaveBeenCalledWith('leads')
  })
})
