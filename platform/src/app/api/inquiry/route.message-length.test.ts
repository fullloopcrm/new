import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

/**
 * POST /api/inquiry's rateLimitDb (3/10min per IP) bounds request COUNT, not
 * the SIZE of its free-text fields -- `message` was already capped at 2000
 * chars, but `company`/`heardFrom` were not, and both flow into the
 * inquiries/partner_requests rows and the admin notification email built
 * from them. Same class as the chat/yinez/feedback message-length caps,
 * ported here via the shared maxLengthError() helper.
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
  } as unknown as NextRequest
}

const VALID_BODY = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '2125551234',
  message: 'Interested in a partnership',
}

beforeEach(() => {
  rateLimitDb.mockReset().mockResolvedValue({ allowed: true, remaining: 2 })
  sendEmail.mockClear()
  supabaseFrom.mockReset()
  supabaseFrom.mockReturnValue({ insert: async () => ({ error: null }) })
})

describe('POST /api/inquiry — company/heardFrom length cap', () => {
  it('rejects when company exceeds 5000 characters, before any DB write or email', async () => {
    const { POST } = await import('./route')
    const res = await POST(fakeRequest({ ...VALID_BODY, company: 'a'.repeat(5001) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('rejects when heardFrom exceeds 5000 characters', async () => {
    const { POST } = await import('./route')
    const res = await POST(fakeRequest({ ...VALID_BODY, heardFrom: 'a'.repeat(5001) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
  })

  it('accepts company/heardFrom exactly at the 5000 character boundary', async () => {
    const { POST } = await import('./route')
    const res = await POST(fakeRequest({ ...VALID_BODY, company: 'a'.repeat(5000), heardFrom: 'b'.repeat(5000) }))
    expect(res.status).toBe(200)
  })

  it('accepts normal-length company/heardFrom', async () => {
    const { POST } = await import('./route')
    const res = await POST(fakeRequest({ ...VALID_BODY, company: 'Acme Cleaning Co', heardFrom: 'Google search' }))
    expect(res.status).toBe(200)
  })
})
