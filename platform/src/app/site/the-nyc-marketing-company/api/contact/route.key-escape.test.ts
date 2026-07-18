import { describe, it, expect, vi } from 'vitest'

/**
 * buildEmailHtml() iterates Object.entries(data) and rendered the object
 * *key* into the notification-email HTML with only a cosmetic
 * capitalization regex — no HTML escaping — while the *value* on the same
 * row was correctly escaped. Since `data` is the raw attacker-controlled
 * JSON body (every field name is caller-chosen), a malicious field name like
 * `<img src=x onerror=...>` landed unescaped in the HTML email sent to the
 * site owner's inbox. Locks in that keys are now escaped identically to
 * values.
 */

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 1 }),
}))

const sendMock = vi.fn(async (_arg: { html: string }) => ({ data: { id: 'test' }, error: null }))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: (arg: { html: string }) => sendMock(arg) }
  },
}))

import { POST } from './route'

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/site/the-nyc-marketing-company/api/contact', {
    method: 'POST',
    headers: { 'x-forwarded-for': '1.2.3.4', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

describe('POST the-nyc-marketing-company/api/contact — HTML key escaping', () => {
  it('escapes a malicious object key before embedding it in the notification email HTML', async () => {
    const maliciousKey = '<img src=x onerror=alert(1)>'
    const res = await POST(
      makeRequest({
        type: 'exit-intent-audit',
        email: 'lead@example.com',
        [maliciousKey]: 'value',
      })
    )

    expect(res.status).toBe(200)
    expect(sendMock).toHaveBeenCalledTimes(1)
    const sentHtml = sendMock.mock.calls[0][0].html as string
    expect(sentHtml).not.toContain(maliciousKey)
    expect(sentHtml).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
