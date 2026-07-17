import { describe, it, expect } from 'vitest'
import { smsReschedule, smsRescheduleES } from './sms-templates'

// Item (58): the generic (non-cleaning) client-facing smsReschedule/
// smsRescheduleES never took is_emergency at all — unlike smsJobRescheduled,
// the team-facing twin already fixed for this same reschedule-into-
// emergency event. The client, who is actually billed the emergency rate,
// had zero signal on this channel. Additive: routine copy unchanged.

const routine = { start_time: '2026-08-01T13:00:00.000Z' }
const emergency = { ...routine, is_emergency: true }

describe('smsReschedule (client-facing) — emergency wording', () => {
  it('routine reschedule keeps byte-identical copy', () => {
    const body = smsReschedule('Acme Plumbing', routine)
    expect(body).not.toContain('emergency')
    expect(body).toContain('Acme Plumbing: Your appointment has been rescheduled')
  })

  it('reschedule that becomes an emergency states the emergency rate applies', () => {
    const body = smsReschedule('Acme Plumbing', emergency)
    expect(body).toContain('same-day/emergency appointment')
    expect(body).toContain('emergency rate applies')
  })

  it('still appends the portal link after the urgency notice when provided', () => {
    const body = smsReschedule('Acme Plumbing', emergency, 'https://acme.example/portal')
    expect(body).toContain('emergency rate applies')
    expect(body).toContain('Details: https://acme.example/portal')
  })
})

describe('smsRescheduleES (client-facing) — emergency wording', () => {
  it('routine reschedule keeps byte-identical copy', () => {
    expect(smsRescheduleES('Acme Plumbing', routine)).not.toContain('emergencia')
  })

  it('reschedule that becomes an emergency states the emergency rate applies, in Spanish', () => {
    const body = smsRescheduleES('Acme Plumbing', emergency)
    expect(body).toContain('emergencia el mismo día')
    expect(body).toContain('tarifa de emergencia')
  })
})
