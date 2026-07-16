import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/contact (the-nyc-marketing-company) is a fully anonymous,
 * unauthenticated lead-capture endpoint used by every form on the site — it
 * had zero rate limiting despite sending an email (with optional attachments)
 * on every call. Now capped at 5 requests / 10 min per IP, same pattern as
 * the platform-wide /api/contact and /api/feedback routes.
 */

const { rateLimitAllowed } = vi.hoisted(() => ({ rateLimitAllowed: { value: true } }))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: rateLimitAllowed.value, remaining: rateLimitAllowed.value ? 1 : 0 }),
}))

const sendMock = vi.fn(async (_arg: unknown) => ({ data: { id: 'test' }, error: null }))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: (arg: unknown) => sendMock(arg) }
  },
}))

import { POST } from './route'

function makeRequest(body: Record<string, unknown>, ip = '1.2.3.4') {
  return new Request('http://localhost/site/the-nyc-marketing-company/api/contact', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

describe('POST the-nyc-marketing-company/api/contact — rate limit', () => {
  it('429s once the per-IP rate limit is exhausted', async () => {
    rateLimitAllowed.value = false
    const res = await POST(makeRequest({ type: 'strategy-quick', name: 'Spammer', email: 'a@b.com' }))
    expect(res.status).toBe(429)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('allows a normal submission through and sends the notification email', async () => {
    rateLimitAllowed.value = true
    const res = await POST(makeRequest({ type: 'strategy-quick', name: 'Real Lead', email: 'lead@example.com' }))
    expect(res.status).toBe(200)
    expect(sendMock).toHaveBeenCalledTimes(1)
  })
})
