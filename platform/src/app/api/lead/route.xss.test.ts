import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * STORED-XSS-VIA-EMAIL — job-application branch of /api/lead.
 *
 * Same shape as the contact/route.ts job-application bug fixed this session
 * (route.xss.test.ts): the "New Job Application" admin notification email
 * interpolated name/email/phone/notes (all attacker-controlled, from a
 * public, unauthenticated form) raw into the HTML body. An anonymous
 * applicant could submit `<img src=x onerror=...>` as their name, which
 * would render/execute when the tenant owner opened the notification in an
 * HTML-rendering mail client. Fixed by escaping every user-controlled field.
 */

const TENANT_A = { id: 'tid-a', name: 'Acme A', slug: 'acme-a', domain: null, primary_color: null, logo_url: null, resend_api_key: null, email: null, email_from: null, phone: null, address: null }

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => TENANT_A,
  tenantSiteUrl: () => 'https://acme-a.example.com',
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 5 })) }))
const { emailAdmins } = vi.hoisted(() => ({ emailAdmins: vi.fn(async (..._args: unknown[]) => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: vi.fn(async () => false) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({ team_applications: [] })
  holder.from = h.from
  emailAdmins.mockClear()
})

function post(body: unknown) {
  return POST(
    new Request('http://acme-a.example.com/api/lead', { method: 'POST', body: JSON.stringify(body) }) as unknown as import('next/server').NextRequest,
  )
}

describe('job-application admin email (/api/lead) — HTML escaping', () => {
  const PAYLOAD_NAME = '<img src=x onerror=alert(1)>'
  const PAYLOAD_MESSAGE = '<script>document.location="//evil.tld"</script>'

  it('escapes an attacker-controlled name/message before building the admin notification HTML', async () => {
    const res = await post({
      type: 'job-application',
      name: PAYLOAD_NAME,
      phone: '5551234567',
      message: PAYLOAD_MESSAGE,
    })
    expect(res.status).toBe(200)
    expect(emailAdmins).toHaveBeenCalledTimes(1)
    const [, , html] = emailAdmins.mock.calls[0]

    expect(html).not.toContain(PAYLOAD_NAME)
    expect(html).not.toContain(PAYLOAD_MESSAGE)
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('onerror=alert(1)>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&lt;script&gt;')
  })
})
