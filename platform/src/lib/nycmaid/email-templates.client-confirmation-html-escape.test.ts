/**
 * clientConfirmationEmail (src/lib/nycmaid/email-templates.ts) -- HTML
 * injection via the assigned cleaner's unescaped first name.
 *
 * `cleaner.name` (booking.team_members.name / booking.cleaners.name) traces
 * back to team_applications.name via provisionApprovedApplicant() in
 * team-provisioning.ts, which copies an approved job applicant's
 * self-submitted `name` verbatim into team_members.name -- no sanitization,
 * no length cap. That name is fully attacker-controlled by anyone who fills
 * out the public, unauthenticated job-application form (POST /api/contact,
 * /api/lead, /api/ingest/application).
 *
 * clientConfirmationEmail() is the live nycmaid-tenant booking-confirmation
 * email (wired via src/lib/messaging/client-email.ts's confirmationEmail(),
 * called from POST /api/client/book and /api/client/recurring) sent to a
 * REAL, uninvolved CUSTOMER. `cleanerName` (the full name) is escapeHtml()'d
 * at each of its own usage sites, but the sibling `cleanerFirst` derived from
 * the exact same field (`cleanerFirst = cleaner.name.split(' ')[0]`) was
 * interpolated raw into HTML content (the "What to expect" paragraph, the
 * supplies noteBox) and into cleanerPhotoHtml's `alt="..."` attribute -- a
 * `"` in the name breaks out of that attribute. Payloads below are
 * single-token (no plain space) since `.split(' ')[0]` would otherwise
 * truncate them before they ever reach the template.
 */
import { describe, it, expect } from 'vitest'
import { clientConfirmationEmail } from './email-templates'

function booking(overrides: Record<string, unknown> = {}) {
  return {
    start_time: '2026-07-20T14:00:00.000Z',
    end_time: '2026-07-20T16:00:00.000Z',
    hourly_rate: 69,
    service_type: 'Standard Cleaning',
    team_size: 1,
    clients: { name: 'Jane Client', address: '123 Main St', pin: null, email: null },
    team_members: { name: 'Attacker' },
    ...overrides,
  }
}

describe('clientConfirmationEmail — cleaner-name HTML escaping', () => {
  it('escapes an attribute-breakout payload in the cleaner name (cleanerPhotoHtml alt=)', () => {
    const { html } = clientConfirmationEmail(
      booking({ team_members: { name: 'x"onerror="alert(1)', photo_url: 'https://example.com/p.jpg' } }),
    )
    expect(html).not.toContain('onerror="alert(1)"')
    expect(html).toContain('&quot;onerror=&quot;alert(1)')
  })

  it('escapes a markup-injection payload in the cleaner name (no photo, hits the prose path)', () => {
    const { html } = clientConfirmationEmail(
      booking({ team_members: { name: '<script>alert(document.cookie)</script>'.replace(/ /g, '') } }),
    )
    expect(html).not.toContain('<script>alert(document.cookie)</script>')
    expect(html).toContain('&lt;script&gt;alert(document.cookie)&lt;/script&gt;')
  })

  it('escapes the same payload when a team-size > 1 label path is used', () => {
    const { html } = clientConfirmationEmail(
      booking({ team_size: 2, team_members: { name: '<script>alert(1)</script>' } }),
    )
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('CONTROL: a benign cleaner name still renders legibly', () => {
    const { html } = clientConfirmationEmail(booking({ team_members: { name: "Mary O'Brien" } }))
    expect(html).toContain('Mary')
    expect(html).toContain('&#39;Brien')
  })
})
