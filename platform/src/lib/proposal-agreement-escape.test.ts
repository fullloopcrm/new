import { describe, it, expect } from 'vitest'
import { buildProposalEmail } from './proposal-email'
import { buildAgreement } from './agreement'

// Regression: businessName / contactName / territoryName come from lead data and
// are interpolated into the proposal + agreement HTML. They must be HTML-escaped
// so a hostile value cannot inject markup. See security-definer-rpc-audit.md §3.

const XSS = '<script>alert(1)</script>'

describe('proposal + agreement XSS hardening', () => {
  it('escapes businessName and territoryName in the proposal body', () => {
    const { html } = buildProposalEmail({
      businessName: XSS,
      contactName: XSS,
      admins: 1,
      teamMembers: 2,
      monthly: 5000,
      payUrl: 'javascript:alert(1)',
      territoryName: XSS,
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    // payUrl scheme is blocked
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain('href="#"')
  })

  it('escapes businessName and contactName in the agreement', () => {
    const { html } = buildAgreement({
      businessName: XSS,
      contactName: XSS,
      admins: 1,
      teamMembers: 2,
      monthly: 5000,
      territoryName: XSS,
      governingState: XSS,
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})
