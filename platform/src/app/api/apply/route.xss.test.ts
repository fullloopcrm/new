import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * STORED-XSS-VIA-EMAIL — POST /api/apply (public team/stylist application).
 *
 * name/specialty/position/experience are free text an anonymous applicant
 * types on a tenant's public careers page. They were interpolated raw into
 * the "New Team Application" admin notify() message — type 'cleaner_application'
 * has no dedicated HTML template in notify.ts, so its `message` becomes
 * literal HTML via notify.ts's fallback. Third-party victim: the tenant admin.
 */

const { notify, emailAdmins, sendEmail } = vi.hoisted(() => ({
  notify: vi.fn(async (..._args: { message: string }[]) => ({ success: true })),
  emailAdmins: vi.fn(async (_tenant: unknown, _subject: string, _html: string) => undefined),
  sendEmail: vi.fn(async (_args: { to: string; subject: string; html: string }) => undefined),
}))
vi.mock('@/lib/notify', () => ({ notify }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tid-a', name: 'Acme' })),
  tenantSiteUrl: vi.fn(() => 'http://acme.test'),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: () => ({
        select: () => ({ single: async () => ({ data: { id: 'app-1' }, error: null }) }),
      }),
    }),
  },
}))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins }))
vi.mock('@/lib/email', () => ({ sendEmail }))
vi.mock('@/lib/messaging/shell', () => ({ emailShell: vi.fn(() => '<html></html>') }))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/apply', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  notify.mockClear()
  emailAdmins.mockClear()
  sendEmail.mockClear()
})

describe('apply/route.ts — HTML escaping of applicant fields', () => {
  const PAYLOAD = '<img src=x onerror=alert(1)>'

  it('escapes name/specialty/experience before building the admin notify() message', async () => {
    const res = await POST(req({ name: PAYLOAD, phone: '5551234567', specialty: PAYLOAD, experience: PAYLOAD }))
    expect(res.status).toBe(200)
    expect(notify).toHaveBeenCalledTimes(1)
    const [{ message }] = notify.mock.calls[0]
    expect(message).not.toContain(PAYLOAD)
    expect(message).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('escapes the payload in the admin alert email too', async () => {
    const res = await POST(req({ name: PAYLOAD, phone: '5551234567', specialty: PAYLOAD, experience: PAYLOAD }))
    expect(res.status).toBe(200)
    expect(emailAdmins).toHaveBeenCalledTimes(1)
    const [, , html] = emailAdmins.mock.calls[0]
    expect(html).not.toContain(PAYLOAD)
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})

describe('apply/route.ts — notifications', () => {
  it('sends an applicant confirmation when an email is provided', async () => {
    const res = await POST(req({ name: 'Jane Doe', phone: '5551234567', email: 'jane@example.com' }))
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail.mock.calls[0][0]).toMatchObject({ to: 'jane@example.com' })
  })

  it('skips the applicant confirmation when no email is provided', async () => {
    const res = await POST(req({ name: 'Jane Doe', phone: '5551234567' }))
    expect(res.status).toBe(200)
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
