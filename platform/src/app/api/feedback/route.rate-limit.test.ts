import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/feedback is intentionally anonymous (public feedback widget, see
 * route.auth-gap.test.ts) but had no rate limit — any caller could script
 * repeated calls to spam the admin inbox via sendEmail. Now capped at
 * 5 requests / hour per IP, same pattern as request-automation.
 */

const { rateLimitAllowed } = vi.hoisted(() => ({ rateLimitAllowed: { value: true } }))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: rateLimitAllowed.value, remaining: rateLimitAllowed.value ? 1 : 0 }),
}))

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn(async () => null),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
    }),
  },
}))

const sendEmailMock = vi.fn(async (_arg: unknown) => {})
vi.mock('@/lib/email', () => ({
  sendEmail: (arg: unknown) => sendEmailMock(arg),
}))

import { POST } from './route'

function makeRequest(body: Record<string, unknown>, ip = '1.2.3.4') {
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

describe('POST /api/feedback — rate limit', () => {
  it('429s once the per-IP rate limit is exhausted', async () => {
    rateLimitAllowed.value = false
    const res = await POST(makeRequest({ message: 'Anonymous spam attempt' }))
    expect(res.status).toBe(429)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('allows a normal submission through and notifies the admin', async () => {
    rateLimitAllowed.value = true
    const res = await POST(makeRequest({ message: 'Legitimate feedback message' }))
    expect(res.status).toBe(201)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })
})
