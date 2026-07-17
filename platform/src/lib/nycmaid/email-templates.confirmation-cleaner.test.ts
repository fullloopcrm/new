import { describe, it, expect } from 'vitest'
import { clientConfirmationEmail } from './email-templates'

/**
 * clientConfirmationEmail is the only nycmaid/email-templates function with
 * live-reachable cleaner info: lib/messaging/client-email.ts's confirmationEmail()
 * calls it directly for the nycmaid tenant, and app/api/client/recurring/route.ts
 * calls confirmationEmailFor() with a booking selected via
 * `team_members!bookings_team_member_id_fkey(*)` -- never `cleaners(*)`.
 *
 * Before the fix, every field (`cleanerName`, `cleanerPhotoUrl`, `cleanerAvg`,
 * `cleanerCount`) read `booking.cleaners?.x`, which is always undefined for
 * that live shape -- so every recurring auto-confirm email to a real nycmaid
 * client silently rendered "Your cleaner" with no photo/rating even though a
 * real team member was already assigned.
 */
function baseBooking(cleanerEmbed: Record<string, unknown>, key: 'team_members' | 'cleaners') {
  return {
    start_time: '2026-07-20T13:00:00',
    end_time: '2026-07-20T15:00:00',
    hourly_rate: 69,
    price: 138,
    service_type: 'Standard Cleaning',
    clients: { name: 'Jane Doe', address: '123 Main St' },
    [key]: cleanerEmbed,
  }
}

describe('clientConfirmationEmail cleaner info', () => {
  it('renders the assigned cleaner name/photo/rating from a team_members embed (live select shape)', () => {
    const booking = baseBooking(
      { name: 'Maria Lopez', photo_url: 'https://example.com/maria.jpg', avg_rating: 4.876, rating_count: 12 },
      'team_members',
    )
    const { html } = clientConfirmationEmail(booking)
    expect(html).toContain('Maria Lopez')
    expect(html).toContain('https://example.com/maria.jpg')
    expect(html).toContain('4.9')
    expect(html).toContain('12 ratings')
    // The "Cleaner" info-table row must resolve to the real name, not the
    // "Your cleaner" placeholder ("Your team of N (lead: ...)" / "Your
    // cleaner: <strong>...</strong>" is a separate, unrelated static label).
    expect(html).toContain('>Cleaner</td>\n  <td style="padding: 8px 0; color: #000; font-size: 14px; font-weight: 500; text-align: left;">Maria Lopez</td>')
  })

  it('still falls back to the legacy cleaners embed if a caller ever passes that shape', () => {
    const booking = baseBooking({ name: 'Ana Ruiz', photo_url: null, avg_rating: null, rating_count: 0 }, 'cleaners')
    const { html } = clientConfirmationEmail(booking)
    expect(html).toContain('Ana Ruiz')
  })

  it('falls back to the generic placeholder when neither embed is present', () => {
    const booking = { ...baseBooking({}, 'team_members'), team_members: undefined }
    const { html } = clientConfirmationEmail(booking)
    expect(html).toContain('Your cleaner')
  })
})
