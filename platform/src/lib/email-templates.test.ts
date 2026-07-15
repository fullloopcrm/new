import { describe, it, expect } from 'vitest'
import {
  bookingConfirmationEmail,
  reviewRequestEmail,
  adminNewClientEmail,
} from './email-templates'

// Regression: customer/tenant-controlled fields interpolated into email HTML
// must be HTML-escaped, and URL fields must be scheme-allowlisted, so a hostile
// clientName / logoUrl / feedbackUrl cannot inject markup or break out of an
// attribute. See deploy-prep/security-definer-rpc-audit.md §3.

const XSS = '<img src=x onerror="alert(1)">'

describe('email-templates XSS hardening', () => {
  it('escapes clientName and tenantName in the body', () => {
    const html = bookingConfirmationEmail({
      tenantName: XSS,
      clientName: XSS,
      serviceName: 'Deep Clean',
      dateTime: 'Tomorrow 9am',
      teamMemberName: 'Pat',
    })
    expect(html).not.toContain('<img src=x onerror')
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
  })

  it('scheme-allowlists the logoUrl in the header <img src>', () => {
    const html = bookingConfirmationEmail({
      tenantName: 'Acme',
      logoUrl: 'javascript:alert(1)',
      clientName: 'Jane',
      serviceName: 'Clean',
      dateTime: 'Now',
      teamMemberName: 'Pat',
    })
    expect(html).not.toContain('src="javascript:alert(1)"')
    expect(html).toContain('src="#"')
  })

  it('blocks a javascript: feedbackUrl and prevents href breakout', () => {
    const html = reviewRequestEmail({
      tenantName: 'Acme',
      clientName: 'Jane',
      feedbackUrl: 'javascript:alert(document.cookie)',
    })
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain('href="#"')
  })

  it('encodes a quote-based attribute breakout in a feedbackUrl', () => {
    const html = reviewRequestEmail({
      tenantName: 'Acme',
      clientName: 'Jane',
      feedbackUrl: 'https://x.com/"><script>alert(1)</script>',
    })
    expect(html).not.toContain('"><script>')
    expect(html).toContain('&quot;&gt;&lt;script&gt;')
  })

  it('escapes hostile client fields rendered through the row helper', () => {
    const { html } = adminNewClientEmail(
      { name: XSS, phone: '<b>555</b>', address: XSS },
      { tenantName: 'Acme' },
    )
    expect(html).not.toContain('<img src=x onerror')
    expect(html).not.toContain('<b>555</b>')
    expect(html).toContain('&lt;img src=x onerror')
  })
})
