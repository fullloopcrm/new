import { describe, it, expect } from 'vitest'
import { teamSmsTemplates } from './team-sms-resolver'

const booking = {
  start_time: '2026-08-01T13:00:00',
  hourly_rate: 69,
  clients: { name: 'Jane Client' },
  team_members: { name: 'Maria Cleaner', pin: '4821' },
}

const laborOnlyBooking = { ...booking, hourly_rate: 49 }

describe('teamSmsTemplates — cleaning tenant (nycmaid) gets rich copy', () => {
  const templates = teamSmsTemplates({ industry: 'cleaning', name: 'The NYC Maid', website_url: 'https://thenycmaid.com' })

  it('jobAssignment includes PIN, portal, and bilingual body', () => {
    const body = templates.jobAssignment(booking)
    expect(body).toContain('PIN: 4821')
    expect(body).toContain('thenycmaid.com/team')
    expect(body).toContain('Nuevo trabajo')
    expect(body).toContain('(Bring supplies / Trae suministros)')
  })

  it('jobAssignment flags labor-only when hourly_rate is 49', () => {
    const body = templates.jobAssignment(laborOnlyBooking)
    expect(body).toContain('Labor only - client has supplies')
  })

  it('dailySummary includes PIN and portal', () => {
    const body = templates.dailySummary('Maria Cleaner', 2, '4821', [booking])
    expect(body).toContain('PIN: 4821')
    expect(body).toContain('thenycmaid.com/team')
  })

  it('lateCheckInCleaner / lateCheckInAdmin reference PIN + names', () => {
    expect(templates.lateCheckInCleaner(booking)).toContain('PIN: 4821')
    expect(templates.lateCheckInAdmin(booking)).toContain('Maria Cleaner')
  })

  it('lateCheckOutCleaner / lateCheckOutAdmin reference PIN + names', () => {
    expect(templates.lateCheckOutCleaner(booking)).toContain('PIN: 4821')
    expect(templates.lateCheckOutAdmin(booking)).toContain('Maria Cleaner')
  })
})

describe('teamSmsTemplates — non-cleaning tenant is unaffected (generic copy)', () => {
  const templates = teamSmsTemplates({ industry: 'plumbing', name: 'Acme Plumbing' })

  it('jobAssignment has no PIN or portal link (unchanged generic behavior)', () => {
    const body = templates.jobAssignment(booking)
    expect(body).not.toContain('PIN:')
    expect(body).not.toContain('Portal:')
    expect(body).toContain('Acme Plumbing: New job')
  })
})
