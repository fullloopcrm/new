import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * STORED-XSS-VIA-EMAIL — /api/leads (public onboarding lead capture).
 *
 * Same shape as the contact/route.ts and lead/route.ts job-application bugs
 * fixed this session: the "New Lead Request" admin notification email
 * (targets the platform's own ADMIN_NOTIFICATION_EMAIL) interpolated
 * name/email/phone/business_name/industry/message — all attacker-controlled,
 * from a public, unauthenticated form — raw into the HTML body. Fixed by
 * escaping every user-controlled field.
 */

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn(async (..._args: { html: string }[]) => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 4 })) }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: () => ({
        select: () => ({ single: async () => ({ data: { id: 'lead-1' }, error: null }) }),
      }),
    }),
  },
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/leads', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  sendEmail.mockClear()
})

describe('admin notification email (/api/leads) — HTML escaping', () => {
  const PAYLOAD_NAME = '<img src=x onerror=alert(1)>'
  const PAYLOAD_MESSAGE = '<script>document.location="//evil.tld"</script>'

  it('escapes attacker-controlled fields before building the admin notification HTML', async () => {
    const res = await POST(req({
      name: PAYLOAD_NAME,
      email: 'attacker@example.com',
      business_name: 'Evil Co',
      message: PAYLOAD_MESSAGE,
    }))
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const [{ html }] = sendEmail.mock.calls[0]

    expect(html).not.toContain(PAYLOAD_NAME)
    expect(html).not.toContain(PAYLOAD_MESSAGE)
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('onerror=alert(1)>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&lt;script&gt;')
  })
})
