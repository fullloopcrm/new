import { describe, it, expect } from 'vitest'
import { clientBookingReceivedEmail, clientConfirmationEmail } from './email-templates'

// clients.name is fully attacker-controlled: POST /api/client/book is public and
// unauthenticated, and inserts body.name into clients.name verbatim
// (src/app/api/client/book/route.ts). For the nycmaid tenant, the booking-received
// and booking-confirmed emails are built by this file's clientBookingReceivedEmail/
// clientConfirmationEmail and sent back to that same attacker-supplied address —
// any unescaped HTML in the name renders live in the recipient's mail client.
// No spaces in the payload itself: these templates derive the first name via
// `.split(' ')[0]`, which would otherwise truncate a space-containing payload
// before the vulnerable interpolation and mask the missing-escape bug.
const XSS_NAME = '<img/src=x/onerror=alert(1)>'

describe('nycmaid email-templates HTML escaping', () => {
  it('escapes an attacker-supplied client name in the booking-received email', () => {
    const booking = {
      start_time: '2026-08-01T09:00:00',
      clients: { name: `${XSS_NAME} Smith`, email: 'client@example.com' },
    }
    const { html } = clientBookingReceivedEmail(booking)
    expect(html).not.toContain(XSS_NAME)
    expect(html).toContain('&lt;img')
  })

  it('escapes an attacker-supplied client name and cleaner name in the confirmation email', () => {
    const booking = {
      start_time: '2026-08-01T09:00:00',
      end_time: '2026-08-01T11:00:00',
      clients: { name: `${XSS_NAME} Smith`, email: 'client@example.com' },
      cleaners: { name: `${XSS_NAME} Jones` },
    }
    const { html } = clientConfirmationEmail(booking)
    expect(html).not.toContain(XSS_NAME)
    expect(html).toContain('&lt;img')
  })
})
