import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * STORED-XSS-VIA-EMAIL — POST /api/apply-ceo (public, unauthenticated
 * founding-CEO application form). `name` is fully attacker-controlled and
 * was interpolated raw into the applicant-confirmation HTML email — which is
 * sent to whatever `email` the caller supplies, NOT necessarily the same
 * person submitting the name. An attacker can submit name=<payload>,
 * email=victim@example.com and have the raw HTML delivered to an arbitrary
 * third-party inbox. Same class as the track/route.ts (660cdf97) and
 * notify.ts (18bcc232) fixes this session, just missed on this call site
 * since it builds its own inline HTML via sendEmail() instead of notify().
 */

const { sendEmail } = vi.hoisted(() => ({
  sendEmail: vi.fn(async (..._args: { to: string; subject: string; html: string }[]) => ({ success: true })),
}))
vi.mock('@/lib/email', () => ({ sendEmail }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({
    id: 'tid-a',
    name: 'Acme Cleaning',
    primary_color: '#111111',
    email_from: null,
    resend_api_key: null,
    selena_config: { lead_confirmation_enabled: true },
  })),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: 'app-1' }, error: null }),
        }),
      }),
    }),
  },
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/apply-ceo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  sendEmail.mockClear()
})

describe('apply-ceo/route.ts — HTML escaping of applicant-controlled confirmation email', () => {
  // No spaces — the confirmation email only interpolates name.split(' ')[0],
  // so a space-containing payload would get truncated before this test's
  // assertions even reach the vulnerable line.
  const PAYLOAD = '<script>alert(1)</script>'

  it('escapes name before building the applicant-confirmation email, delivered to attacker-chosen email', async () => {
    const res = await POST(req({
      name: PAYLOAD,
      email: 'victim@example.com',
      phone: '2125551234',
    }))
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const [{ to, html }] = sendEmail.mock.calls[0]
    expect(to).toBe('victim@example.com')
    expect(html).not.toContain(PAYLOAD)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})
