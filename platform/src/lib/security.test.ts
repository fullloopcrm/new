import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendEmailMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/email', () => ({ sendEmail: (...args: unknown[]) => sendEmailMock(...args) }))

const insertMock = vi.fn().mockResolvedValue({ data: null, error: null })
const tenantName = { current: '<img src=x onerror=alert(1)>Acme' }

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { email: 'owner@acme.test', name: tenantName.current, resend_api_key: null } }),
            }),
          }),
        }
      }
      return { insert: insertMock }
    },
  },
}))

import { logSecurityEvent } from './security'

describe('logSecurityEvent HTML escaping (critical email path)', () => {
  beforeEach(() => {
    sendEmailMock.mockClear()
    insertMock.mockClear()
    tenantName.current = '<img src=x onerror=alert(1)>Acme'
  })

  it('escapes a hostile tenant business name embedded in the critical security-alert email', async () => {
    await logSecurityEvent({ tenantId: 't1', type: 'api_key_change', description: 'Integration key updated: stripe api key' })

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const html = sendEmailMock.mock.calls[0][0].html as string
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('escapes an attacker-controlled description on the critical email path', async () => {
    tenantName.current = 'Acme'
    await logSecurityEvent({
      tenantId: 't1',
      type: 'suspicious_login',
      description: '<script>alert(1)</script>',
    })

    const html = sendEmailMock.mock.calls[0][0].html as string
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes a spoofable ip value when present on the critical email path', async () => {
    tenantName.current = 'Acme'
    await logSecurityEvent({
      tenantId: 't1',
      type: 'password_change',
      description: 'Password changed',
      ip: '<script>alert(1)</script>',
    })

    const html = sendEmailMock.mock.calls[0][0].html as string
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
