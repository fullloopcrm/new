import { describe, it, expect } from 'vitest'
import { emailShell } from './shell'

/**
 * emailShell() is the shared HTML wrapper for every customer-facing email
 * (quote sends, comhub sends, leads, cron comhub-email). brand.name and
 * brand.primaryColor are tenant self-serve fields with no format enforcement
 * server-side, and land raw inside HTML attributes / a CSS-declaration
 * context — a malicious tenant could target a real client/lead/referrer's
 * inbox, not just their own.
 */
describe('emailShell — tenant-controlled brand fields', () => {
  it('escapes an attribute-breakout payload in brand.name', () => {
    const html = emailShell({
      brand: { name: `Acme" onmouseover="alert(1)`, logoUrl: 'https://x/logo.png' },
      heading: 'Hi',
      bodyHtml: '<p>body</p>',
    })
    expect(html).not.toContain('onmouseover="alert(1)"')
    expect(html).toContain('&quot;')
  })

  it('rejects a CSS-declaration injection payload in brand.primaryColor', () => {
    const html = emailShell({
      brand: {
        name: 'Acme',
        primaryColor: 'red;position:fixed;top:0;left:0;width:100%;height:100%;background:url(https://evil.example/track.gif)',
      },
      heading: 'Hi',
      bodyHtml: '<p>body</p>',
      cta: { label: 'Click', url: 'https://x/y' },
    })
    expect(html).not.toContain('position:fixed')
    expect(html).not.toContain('evil.example')
  })

  it('rejects a style-attribute breakout payload in brand.primaryColor', () => {
    const html = emailShell({
      brand: { name: 'Acme', primaryColor: `red" onmouseover="alert(1)` },
      heading: 'Hi',
      bodyHtml: '<p>body</p>',
    })
    expect(html).not.toContain('onmouseover="alert(1)"')
  })

  it('renders a well-formed primaryColor unchanged', () => {
    const html = emailShell({
      brand: { name: 'Acme', primaryColor: '#0d9488' },
      heading: 'Hi',
      bodyHtml: '<p>body</p>',
      cta: { label: 'Click', url: 'https://x/y' },
    })
    expect(html).toContain('background:#0d9488')
  })
})
