import { describe, it, expect } from 'vitest'
import { escapeHtml } from '@/lib/escape-html'
import { buildLeadNotificationHtml } from '@/app/api/leads/notification-email'
import { buildProspectNotificationHtml } from '@/app/api/prospects/notification-email'

/**
 * Regression tests for the admin-notification email HTML injection fix.
 * Both /api/leads and /api/prospects are public, unauthenticated routes whose
 * request bodies flow into the admin email. Injected tags must be escaped.
 */

const XSS = '<script>alert(1)</script>'
const IMG = '<img src=x onerror=alert(1)>'

describe('escapeHtml', () => {
  it('escapes all HTML-significant characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })

  it('escapes a script payload', () => {
    expect(escapeHtml(XSS)).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('collapses null/undefined to empty string', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })
})

describe('buildLeadNotificationHtml', () => {
  it('escapes injected tags in every user-supplied field', () => {
    const html = buildLeadNotificationHtml(
      {
        name: XSS,
        email: XSS,
        phone: XSS,
        business_name: XSS,
        industry: XSS,
        message: XSS,
      },
      'https://app.example.com',
    )
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('renders optional-field fallbacks without injecting', () => {
    const html = buildLeadNotificationHtml(
      { name: 'Jane', email: 'jane@example.com', business_name: 'Acme' },
      'https://app.example.com',
    )
    expect(html).toContain('Not provided')
    expect(html).toContain('Not specified')
    expect(html).toContain('Acme')
  })
})

describe('buildProspectNotificationHtml', () => {
  it('escapes injected tags in the summary block', () => {
    const summary = `Business: ${XSS}\nOwner: ${IMG}`
    const html = buildProspectNotificationHtml(summary, 'https://example.com')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
