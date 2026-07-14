import { describe, it, expect } from 'vitest'
import { adminNewClientEmail } from './email-templates'

/**
 * STORED-XSS-VIA-EMAIL — adminNewClientEmail, the shared "New client added"
 * admin template used by /api/lead, /api/contact, /api/ingest/lead, and
 * /api/client/collect. name/phone/email/address/notes/referralInfo are all
 * attacker-controlled free text from public, unauthenticated lead-capture
 * forms, interpolated raw into an HTML table row with no escaping. Third-party
 * victim: the tenant admin reading the notification, not the form submitter.
 */
describe('adminNewClientEmail — HTML escaping of client-controlled fields', () => {
  const PAYLOAD = '<img src=x onerror=alert(document.cookie)>'

  it('escapes every attacker-controlled field before building the admin HTML table', () => {
    const { html } = adminNewClientEmail(
      {
        name: PAYLOAD,
        phone: PAYLOAD,
        email: PAYLOAD,
        address: PAYLOAD,
        notes: PAYLOAD,
        referralInfo: PAYLOAD,
        referrerMatched: true,
      },
      { tenantName: 'Acme' },
    )

    expect(html).not.toContain(PAYLOAD)
    expect(html.match(/&lt;img src=x onerror=alert\(document\.cookie\)&gt;/g)?.length).toBe(6)
  })
})
