/**
 * STORED-XSS-VIA-EMAIL fix — job-application branch of /api/contact.
 *
 * LEADER finding (2026-07-13): the "New Team Application" admin notification
 * email was the only email-building code path in the repo that skipped
 * escapeHtml() — name/phone/notes (all attacker-controlled, from a public,
 * unauthenticated form) were interpolated raw into the HTML body. An
 * anonymous applicant could submit a payload like `<img src=x onerror=...>`
 * as their name/message, which would render/execute when the tenant owner
 * opened the notification in an HTML-rendering mail client. Fixed by
 * escaping every user-controlled field with the repo's existing escapeHtml.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn().mockResolvedValue({
    id: 'tenant-1',
    name: 'Test Tenant',
    slug: 'test-tenant',
    domain: 'test-tenant.example.com',
    selena_config: null,
  }),
  tenantSiteUrl: () => 'https://test-tenant.example.com',
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn().mockResolvedValue({ allowed: true }),
}))

vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn() }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: vi.fn().mockResolvedValue(true) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined), tenantSender: vi.fn() }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: vi.fn().mockReturnValue({ subject: '', html: '' }) }))

const { emailAdmins, insertSingle } = vi.hoisted(() => ({
  emailAdmins: vi.fn().mockResolvedValue(undefined),
  insertSingle: vi.fn().mockResolvedValue({ data: { id: 'app-1' }, error: null }),
}))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: () => ({
        select: () => ({ single: insertSingle }),
      }),
    }),
  },
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('https://x.test/api/contact', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  emailAdmins.mockClear()
})

describe('job-application admin email — HTML escaping', () => {
  const PAYLOAD_NAME = '<img src=x onerror=alert(1)>'
  const PAYLOAD_MESSAGE = '<script>document.location="//evil.tld"</script>'

  it('escapes an attacker-controlled name/message before building the admin notification HTML', async () => {
    const res = await POST(req({
      name: PAYLOAD_NAME,
      phone: '5551234567',
      position: 'Cleaner',
      message: PAYLOAD_MESSAGE,
    }) as never)
    expect(res.status).toBe(200)

    expect(emailAdmins).toHaveBeenCalledTimes(1)
    const [, , html] = emailAdmins.mock.calls[0]

    // The raw payloads must never appear verbatim in the outgoing HTML.
    expect(html).not.toContain(PAYLOAD_NAME)
    expect(html).not.toContain(PAYLOAD_MESSAGE)
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('onerror=alert(1)>')

    // The escaped form should be present instead.
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&lt;script&gt;')
  })
})
