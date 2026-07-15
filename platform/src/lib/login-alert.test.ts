import { describe, it, expect } from 'vitest'
import { alertHtml } from './login-alert'

// Regression: ip/ua come straight from client-controlled request headers
// (x-forwarded-for, user-agent) in admin-auth/route.ts and were interpolated
// into the admin login-alert HTML email unescaped. An attacker could set a
// malicious User-Agent on a login attempt and inject markup into the "was
// this you?" security alert sent to the tenant owner / super-admin.

const XSS = '<script>alert(1)</script>'

describe('login-alert XSS hardening', () => {
  it('escapes ip, ua, brand, and who in the alert email', () => {
    const html = alertHtml(XSS, XSS, XSS, '2026-01-01 12:00 PM', XSS)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('escapes ua even when truncated to 160 chars', () => {
    const ua = 'x'.repeat(140) + XSS
    const html = alertHtml('Acme', '1.2.3.4', ua, '2026-01-01 12:00 PM')
    expect(html).not.toContain('<script>')
  })
})
