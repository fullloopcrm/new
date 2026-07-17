import { describe, it, expect } from 'vitest'
import { clientSmsTemplates } from './client-sms'
import { teamSmsTemplates } from './team-sms-resolver'

// Item (115): clientSmsTemplates()/teamSmsTemplates()'s neutral (non-cleaning)
// branch calls the generic sms-templates.ts functions this item taught a
// `timezone` param -- confirms the resolvers actually read `tenant.timezone`
// and pass it through, rather than continuing to call the generic functions
// with no timezone (which would silently fall back to ET for every tenant,
// including Pacific/Mountain/Central ones the resolver is specifically meant
// to serve correctly).

const booking = { start_time: '2026-01-15T02:30:00.000Z' } // Jan 15, 2:30am UTC

describe('clientSmsTemplates — passes tenant.timezone through (item 115)', () => {
  it('bookingConfirmation renders in the tenant Pacific zone, not ET default', () => {
    const templates = clientSmsTemplates({ name: 'Acme', industry: 'plumbing', timezone: 'America/Los_Angeles' })
    const body = templates.bookingConfirmation(booking)
    expect(body).toContain('Jan 14')
    expect(body).toContain('6:30 PM')
  })

  it('falls back to ET when the tenant row has no timezone set', () => {
    const templates = clientSmsTemplates({ name: 'Acme', industry: 'plumbing' })
    const body = templates.bookingConfirmation(booking)
    expect(body).toContain('9:30 PM')
  })
})

describe('teamSmsTemplates — passes tenant.timezone through (item 115)', () => {
  it('jobAssignment renders in the tenant Pacific zone, not ET default', () => {
    const templates = teamSmsTemplates({ name: 'Acme', industry: 'plumbing', timezone: 'America/Los_Angeles' })
    const body = templates.jobAssignment({ ...booking, clients: { name: 'Jane' } })
    expect(body).toContain('Jan 14')
    expect(body).toContain('6:30 PM')
  })

  it('falls back to ET when the tenant row has no timezone set', () => {
    const templates = teamSmsTemplates({ name: 'Acme', industry: 'plumbing' })
    const body = templates.jobAssignment({ ...booking, clients: { name: 'Jane' } })
    expect(body).toContain('9:30 PM')
  })
})
