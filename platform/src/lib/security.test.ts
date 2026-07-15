import { describe, it, expect } from 'vitest'
import { securityAlertHtml } from './security'

// Regression: description (e.g. "Invite sent to <email> as <role>" in
// admin/invites/route.ts) and tenant.name were interpolated unescaped into
// the security-alert email sent on critical account events. A crafted
// invite email or tenant name could inject markup. Matches the escapeHtml
// pattern already used in login-alert.ts, email-templates.ts.

const XSS = '<script>alert(1)</script>'

describe('security alert XSS hardening', () => {
  it('escapes tenant name, title, description, and ip', () => {
    const html = securityAlertHtml(XSS, XSS, XSS, XSS)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('omits the IP line when no ip is given', () => {
    const html = securityAlertHtml('Acme', 'New Login', 'Login from new device')
    expect(html).not.toContain('IP:')
  })
})
