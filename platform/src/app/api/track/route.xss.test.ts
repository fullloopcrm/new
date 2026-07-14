import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * STORED-XSS-VIA-EMAIL — POST /api/track (public, unauthenticated visitor
 * analytics beacon, CORS *). page/referrer/utm_source/cta_type are fully
 * attacker-controlled and were interpolated raw into the "New lead" HTML
 * email sent to the tenant's lead_notification_email via sendEmail() --
 * no dedicated template, no escaping. Third-party victim: the tenant admin
 * reading the email (likely in an HTML-rendering mail client). Same class
 * as the ae9197a7 notify()-call-site batch, but this route builds its own
 * HTML inline via sendEmail() instead of going through notify.ts, so it
 * was missed by that sweep.
 */

const { sendEmail } = vi.hoisted(() => ({
  sendEmail: vi.fn(async (..._args: { to: string; subject: string; html: string }[]) => ({ success: true })),
}))
vi.mock('@/lib/email', () => ({ sendEmail }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ lead_notification_email: 'owner@tenant.test', business_name: 'Acme' })),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: async () => ({ error: null }),
    }),
  },
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/track', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  sendEmail.mockClear()
})

describe('track/route.ts — HTML escaping of visitor-controlled CTA-email fields', () => {
  const PAYLOAD = '<img src=x onerror=alert(1)>'

  it('escapes page/referrer/utm_source/cta_type before building the lead-notification email', async () => {
    const res = await POST(req({
      tenant_id: 'tid-a',
      domain: 'example.com',
      action: 'cta',
      cta_clicked: true,
      cta_type: PAYLOAD,
      page: PAYLOAD,
      referrer: PAYLOAD,
      utm_source: PAYLOAD,
      session_id: 'sess-1',
    }))
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const [{ html }] = sendEmail.mock.calls[0]
    expect(html).not.toContain(PAYLOAD)
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
