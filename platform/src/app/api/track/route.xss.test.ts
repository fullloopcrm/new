/**
 * STORED-XSS-VIA-EMAIL — /api/track lead-notification email.
 *
 * Broad-hunt finding (2026-07-13): notifyLeadEmailIfNeeded() interpolated
 * page/referrer/utm_source (all attacker-controlled — /api/track is public
 * and unauthenticated, hit by anonymous site visitors on every CTA click)
 * raw into the "New lead" HTML email sent to the tenant's
 * lead_notification_email. An attacker can POST a crafted payload as
 * page/referrer/utm_source with any known tenant_id and a cta_clicked:true
 * flag to inject HTML/script into an email the tenant owner opens in an
 * HTML-rendering mail client. Fixed by escaping every user-controlled field
 * with the repo's existing escapeHtml, matching the established pattern
 * (contact/route.xss.test.ts, agreement/sign routes).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn().mockResolvedValue({ allowed: true }),
}))

const { sendEmail } = vi.hoisted(() => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/email', () => ({ sendEmail }))

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn().mockResolvedValue({ lead_notification_email: 'owner@tenant.test', business_name: 'Test Biz' }),
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn().mockResolvedValue({ id: 'tenant-1', slug: 'test-tenant' }),
}))

const { insert } = vi.hoisted(() => ({
  insert: vi.fn().mockResolvedValue({ error: null }),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: () => ({ insert }) },
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('https://x.test/api/track', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  sendEmail.mockClear()
})

describe('lead-notification email — HTML escaping', () => {
  const PAYLOAD_PAGE = '<img src=x onerror=alert(1)>'
  const PAYLOAD_REFERRER = '<script>document.location="//evil.tld"</script>'
  const PAYLOAD_UTM = '"><svg onload=alert(2)>'

  it('escapes attacker-controlled page/referrer/utm_source before building the lead-notification HTML', async () => {
    const res = await POST(req({
      tenant_id: 'tenant-1',
      domain: 'test-tenant.example.com',
      action: 'cta',
      cta_clicked: true,
      cta_type: 'book-now',
      page: PAYLOAD_PAGE,
      referrer: PAYLOAD_REFERRER,
      utm_source: PAYLOAD_UTM,
    }) as never)
    expect(res.status).toBe(200)

    // Fire-and-forget async — flush microtasks.
    await new Promise((r) => setTimeout(r, 0))

    expect(sendEmail).toHaveBeenCalledTimes(1)
    const { html } = sendEmail.mock.calls[0][0]

    expect(html).not.toContain(PAYLOAD_PAGE)
    expect(html).not.toContain(PAYLOAD_REFERRER)
    expect(html).not.toContain(PAYLOAD_UTM)
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<svg onload=alert(2)>')

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;svg onload=alert(2)&gt;')
  })
})
