import { describe, it, expect } from 'vitest'
import { smsJobAssignment, smsJobRescheduled } from './sms-templates'

// Item (7)/P11.21 push-half fix (smsJobAssignment) + the reschedule-path twin
// found while closing it (smsJobRescheduled): a tech assigned or reassigned
// to an emergency job previously got byte-identical copy to a routine job.
// is_emergency/pay_rate are optional on both signatures so every existing
// caller without those fields is unaffected.

describe('smsJobAssignment — emergency wording', () => {
  const routine = { start_time: '2026-08-01T13:00:00.000Z', clients: { name: 'Jane Doe' } }
  const emergency = { ...routine, is_emergency: true, pay_rate: 90 }

  it('routine job keeps byte-identical copy (no URGENT, no rate)', () => {
    const body = smsJobAssignment('Acme Plumbing', routine)
    expect(body).not.toContain('URGENT')
    expect(body).not.toContain('Pay: $')
    expect(body).toContain('Acme Plumbing: New job')
  })

  it('emergency job prefixes URGENT and states the pay rate, bilingual', () => {
    const body = smsJobAssignment('Acme Plumbing', emergency)
    expect(body).toContain('URGENT — New job')
    expect(body).toContain('URGENTE — Nuevo trabajo')
    expect(body).toContain('Pay: $90/hr.')
  })

  it('emergency with no pay_rate on record omits the rate line but keeps URGENT', () => {
    const body = smsJobAssignment('Acme Plumbing', { ...routine, is_emergency: true })
    expect(body).toContain('URGENT — New job')
    expect(body).not.toContain('Pay: $')
  })
})

describe('smsJobRescheduled — emergency wording (reschedule-into-same-day path)', () => {
  const routine = { start_time: '2026-08-01T13:00:00.000Z', clients: { name: 'Jane Doe' } }
  const emergency = { ...routine, is_emergency: true, pay_rate: 90 }

  it('routine reschedule keeps byte-identical copy (no URGENT, no rate)', () => {
    const body = smsJobRescheduled('Acme Plumbing', routine)
    expect(body).not.toContain('URGENT')
    expect(body).not.toContain('Pay: $')
    expect(body).toContain('Acme Plumbing: Rescheduled')
  })

  it('reschedule that becomes an emergency prefixes URGENT and states the pay rate, bilingual', () => {
    const body = smsJobRescheduled('Acme Plumbing', emergency)
    expect(body).toContain('URGENT — Rescheduled')
    expect(body).toContain('URGENTE — Reprogramado')
    expect(body).toContain('Pay: $90/hr.')
  })
})
