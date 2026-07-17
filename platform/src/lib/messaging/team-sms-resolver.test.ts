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

// Item (7)/P11.21 push-half fix: an assigned tech previously got byte-identical
// copy whether the job was routine or a same-day emergency. is_emergency/pay_rate
// are optional on TeamBookingLike so every non-emergency caller above stays
// unchanged (already asserted: neither contains "URGENT" or a $ rate).
describe('teamSmsTemplates — emergency job assignment now surfaces urgency + pay rate', () => {
  const emergencyBooking = { ...booking, is_emergency: true, pay_rate: 90 }

  it('cleaning-tenant jobAssignment prefixes URGENT and states the pay rate, bilingual', () => {
    const templates = teamSmsTemplates({ industry: 'cleaning', name: 'The NYC Maid', website_url: 'https://thenycmaid.com' })
    const body = templates.jobAssignment(emergencyBooking)
    expect(body).toContain('URGENT — New job')
    expect(body).toContain('URGENTE — Nuevo trabajo')
    expect(body).toContain('Pay: $90/hr.')
  })

  it('generic (non-cleaning) jobAssignment prefixes URGENT and states the pay rate, bilingual', () => {
    const templates = teamSmsTemplates({ industry: 'plumbing', name: 'Acme Plumbing' })
    const body = templates.jobAssignment(emergencyBooking)
    expect(body).toContain('URGENT — New job')
    expect(body).toContain('URGENTE — Nuevo trabajo')
    expect(body).toContain('Pay: $90/hr.')
  })

  it('a routine (non-emergency) job keeps byte-identical copy, no rate line', () => {
    const templates = teamSmsTemplates({ industry: 'plumbing', name: 'Acme Plumbing' })
    const body = templates.jobAssignment(booking)
    expect(body).not.toContain('URGENT')
    expect(body).not.toContain('Pay: $')
  })

  it('emergency with no pay_rate on record omits the rate line but keeps the URGENT prefix', () => {
    const templates = teamSmsTemplates({ industry: 'plumbing', name: 'Acme Plumbing' })
    const body = templates.jobAssignment({ ...booking, is_emergency: true })
    expect(body).toContain('URGENT — New job')
    expect(body).not.toContain('Pay: $')
  })
})
