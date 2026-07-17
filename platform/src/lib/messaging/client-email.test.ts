/**
 * client-email.ts's non-nycmaid confirmationEmail() never passed booking.price
 * through to bookingConfirmationEmail even though that template has always
 * supported and rendered a `price` row (email-templates.ts's TemplateData).
 * Every non-nycmaid tenant's confirmed-booking email was silently price-blind.
 * Archetype-depth continuation of EMERGENCY-24-7-ARCHETYPE-GAPS-AND-FRICTION's
 * price-transparency thread -- this is the CONFIRMED email (price is definite,
 * unlike the received email's still-open product-call case).
 */
import { describe, it, expect } from 'vitest'
import { confirmationEmail } from './client-email'

const TENANT = { slug: 'acme-plumbing', name: 'Acme Plumbing', primary_color: '#111827' }

const BOOKING = {
  clients: { name: 'Jane Doe', address: '123 Main St' },
  service_type: 'Emergency Plumbing',
  start_time: '2026-07-20T14:00:00.000Z',
  end_time: '2026-07-20T16:00:00.000Z',
  team_members: { name: 'Bob' },
  hourly_rate: 87.5,
  price: 17500, // cents -> $175.00
}

describe('confirmationEmail (non-nycmaid tenants)', () => {
  it('renders the price row when booking.price is a number', () => {
    const { html } = confirmationEmail(TENANT, BOOKING)
    expect(html).toContain('$175.00')
  })

  it('omits the price row when booking.price is absent', () => {
    const { html } = confirmationEmail(TENANT, { ...BOOKING, price: undefined })
    expect(html).not.toContain('Price')
  })

  it('does not touch the nycmaid path (still routes to nycmaid templates, no shared price wiring)', () => {
    const { html } = confirmationEmail({ slug: 'nycmaid', name: 'NYC Maid' }, BOOKING)
    expect(html).not.toContain('$175.00')
  })
})
