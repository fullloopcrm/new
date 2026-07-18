import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

/**
 * POST /api/inquiry is the public, unauthenticated marketing-site contact
 * form — no tenant, no session. Unlike every sibling public form this session
 * already covers (contact, waitlist, apply, apply-ceo, lead, errors, track,
 * all rate-limited via rateLimitDb), this one had zero cap. Worse than most
 * siblings: an "Acquirer" + "$1M+" submission fires a live Telnyx SMS to the
 * owner's phone (real per-message cost) on every single POST, with no
 * server-side check that those are real values — a scripted flood could
 * both spam the owner's inbox/phone and rack up SMS charges indefinitely.
 * Fixed with the same rateLimitDb(`inquiry:${ip}`) bucket convention used by
 * errors/track's platform-level (non-tenant) routes.
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
  message: 'Interested in acquiring the platform',
  role: 'Acquirer',
  budget: '$10M+',
}

beforeEach(() => {
  rateLimitDb.mockReset()
  sendEmail.mockClear()
  supabaseFrom.mockReset()
  supabaseFrom.mockReturnValue({ insert: async () => ({ error: null }) })
})

describe('POST /api/inquiry — rate limiting', () => {
  it('rejects with 429 once the per-IP bucket is exhausted, before touching the DB or sending email/SMS', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest(VALID_BODY))
    expect(res.status).toBe(429)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith('inquiry:9.9.9.9', 3, 10 * 60 * 1000)
  })

  it('passes through and persists/notifies when under the limit', async () => {
    rateLimitDb.mockResolvedValue({ allowed: true, remaining: 2 })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest(VALID_BODY))
    expect(res.status).toBe(200)
    expect(supabaseFrom).toHaveBeenCalledWith('inquiries')
  })
})
