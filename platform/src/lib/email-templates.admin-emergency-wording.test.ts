import { describe, it, expect } from 'vitest'
import { adminNewBookingRequestEmail } from './email-templates'

/**
 * adminNewBookingRequestEmail's type signature had no is_emergency field at
 * all — the admin's own "New Booking" email rendered byte-identical whether
 * the job was routine or a same-day burst-pipe emergency. See
 * EMERGENCY-24-7-ARCHETYPE-GAPS-AND-FRICTION-2026-07-16.md, archetype-depth
 * finding. Mirrors the 🚨/URGENT convention already established by
 * bookingReceivedEmail (client side) and the team-SMS templates.
 */

const TENANT = { tenantName: 'Acme Plumbing' }

describe('adminNewBookingRequestEmail — emergency wording', () => {
  it('a routine booking has no urgency markers', () => {
    const { subject, html } = adminNewBookingRequestEmail({ clientName: 'Alice' }, TENANT)
    expect(subject).toBe('New Booking: Alice')
    expect(html).not.toContain('🚨')
    expect(html).not.toContain('dispatch ASAP')
  })

  it('an emergency booking prefixes the subject and adds a dispatch-now banner', () => {
    const { subject, html } = adminNewBookingRequestEmail({ clientName: 'Alice', isEmergency: true }, TENANT)
    expect(subject).toBe('🚨 URGENT — New Booking: Alice')
    expect(html).toContain('🚨 New Urgent Booking Request')
    expect(html).toContain('Same-day emergency — dispatch ASAP.')
  })
})
