import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendEmailMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/email', () => ({ sendEmail: (...args: unknown[]) => sendEmailMock(...args) }))

const emailAdminsMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: (...args: unknown[]) => emailAdminsMock(...args) }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { name: '<img src=x onerror=alert(1)>Acme' } }),
        }),
      }),
    }),
  },
}))

import { sendLoginAlert } from './login-alert'

describe('sendLoginAlert HTML escaping', () => {
  beforeEach(() => {
    sendEmailMock.mockClear()
    emailAdminsMock.mockClear()
  })

  it('escapes an attacker-controlled User-Agent header before embedding it in the platform super-admin alert HTML', async () => {
    const maliciousUa = '<img src=x onerror=alert(1)>Mozilla/5.0'
    await sendLoginAlert({ ip: '1.2.3.4', ua: maliciousUa, who: 'Super Admin (platform)' })

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const html = sendEmailMock.mock.calls[0][0].html as string
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('escapes an attacker-controlled who field on the super-admin alert', async () => {
    const maliciousWho = 'Super Admin"><script>alert(1)</script>'
    await sendLoginAlert({ ip: '1.2.3.4', ua: 'ua', who: maliciousWho })

    const html = sendEmailMock.mock.calls[0][0].html as string
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes a hostile tenant name (brand) on the tenant-admin alert path', async () => {
    await sendLoginAlert({ tenantId: 'tenant-1', ip: '1.2.3.4', ua: 'ua', who: 'Tenant admin (owner)' })

    expect(emailAdminsMock).toHaveBeenCalledTimes(1)
    const html = emailAdminsMock.mock.calls[0][2] as string
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
