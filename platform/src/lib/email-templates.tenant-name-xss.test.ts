import { describe, it, expect } from 'vitest'
import { dailySummaryEmail, bookingConfirmationEmail } from './email-templates'

/**
 * data.tenantName (a tenant's own business name, editable in settings and
 * shown to every recipient of these 14 shared builders) was spliced
 * unescaped into the base template's header/footer plus several per-email
 * body lines. A tenant name containing markup would execute in every
 * outbound notification email, not just campaign sends.
 */

const maliciousTenant = '<img src=x onerror=alert(1)>'

describe('email-templates.ts — tenantName escaping', () => {
  it('escapes tenantName in the shared base template header/footer', () => {
    const html = dailySummaryEmail({
      tenantName: maliciousTenant,
      todaysJobs: 1,
      yesterdayRevenue: '$100',
      upcomingSchedules: 2,
    })
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('escapes tenantName in a per-email body line (dailySummaryEmail)', () => {
    const html = dailySummaryEmail({
      tenantName: maliciousTenant,
      todaysJobs: 1,
      yesterdayRevenue: '$100',
      upcomingSchedules: 2,
    })
    expect(html).toContain("Here's your daily summary for &lt;img src=x onerror=alert(1)&gt;.")
  })

  it('escapes tenantName in bookingConfirmationEmail body line', () => {
    const html = bookingConfirmationEmail({
      tenantName: maliciousTenant,
      clientName: 'Alice',
      serviceName: 'Cleaning',
      dateTime: 'Mon 9am',
      teamMemberName: 'Bob',
    })
    expect(html).toContain('your appointment with &lt;img src=x onerror=alert(1)&gt; is confirmed')
  })
})
