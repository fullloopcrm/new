import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/leads's rateLimitDb (5/10min per ip) bounds request COUNT, not
 * the free-text `message` field's SIZE -- a single call inside that cap
 * could still stuff an arbitrarily large string into leads/partner_requests
 * and the admin notification email built from it. Same class as the
 * chat/yinez/feedback message-length caps, ported here via the shared
 * maxLengthError() helper.
 */

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))
const sendEmail = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/email', () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args) }))
const supabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) } }))

function req(body: Record<string, unknown>, ip = '9.9.9.9') {
  return {
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? ip : null) },
    json: async () => body,
  } as unknown as Request
}

const VALID_BODY = { name: 'Jane Doe', email: 'jane@example.com', business_name: 'Jane Cleaning Co' }

beforeEach(() => {
  rateLimitDb.mockReset().mockResolvedValue({ allowed: true, remaining: 4 })
  sendEmail.mockClear()
  supabaseFrom.mockReset()
  supabaseFrom.mockReturnValue({
    insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'lead-1' }, error: null }) }) }),
  })
})

describe('POST /api/leads — message length cap', () => {
  it('rejects a message over 5000 characters with 400, before any DB write or email', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ ...VALID_BODY, message: 'a'.repeat(5001) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('accepts a message exactly at the 5000 character boundary', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ ...VALID_BODY, message: 'a'.repeat(5000) }))
    expect(res.status).toBe(200)
  })

  it('accepts a normal short message', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ ...VALID_BODY, message: 'Interested in a demo.' }))
    expect(res.status).toBe(200)
  })
})
