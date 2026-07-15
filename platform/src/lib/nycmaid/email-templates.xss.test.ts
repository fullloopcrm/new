import { describe, it, expect } from 'vitest'
import { clientConfirmationEmail, cleanerAssignmentEmail } from './email-templates'

// Regression guard: customer/tenant-controlled fields must be HTML-escaped
// before landing in the email body, and data-derived URLs must pass through
// safeUrl(). A raw <script> or a javascript: href reaching the output is XSS.
const XSS = `<script>alert('xss')</script>`
const ESCAPED = '&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;'

describe('nycmaid email-templates — XSS escaping', () => {
  it('escapes name/address/service/email/pin and neutralizes photo_url in the confirmation email', () => {
    const { html } = clientConfirmationEmail({
      start_time: '2026-07-12T15:00:00Z',
      end_time: '2026-07-12T17:00:00Z',
      hourly_rate: 69,
      service_type: XSS,
      clients: { name: XSS, address: XSS, email: XSS, pin: XSS },
      cleaners: { name: XSS, photo_url: 'javascript:alert(1)' },
    })
    expect(html).not.toContain('<script>alert')
    expect(html).toContain(ESCAPED)
    expect(html).not.toContain('src="javascript:')
  })

  it('escapes notes/address/client/service in the cleaner assignment email', () => {
    const { html } = cleanerAssignmentEmail({
      start_time: '2026-07-12T15:00:00Z',
      hourly_rate: 69,
      service_type: XSS,
      notes: XSS,
      clients: { name: XSS, address: XSS },
      cleaners: { name: 'Ana' },
    })
    expect(html).not.toContain('<script>alert')
    expect(html).toContain(ESCAPED)
  })
})
