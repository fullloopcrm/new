import { describe, it, expect } from 'vitest'
import { reschedule, rescheduleES } from './sms-cleaning'
import type { TenantBrand } from './brand'

// Item (58): reschedule()/rescheduleES() take a BookingLike that already
// carries is_emergency (same type every other cleaning template in this
// file reads), but never read it — unlike sms-templates.ts's
// smsJobRescheduled (team-facing), the cleaning client never learned a
// reschedule had turned same-day/emergency. Confirms the fix is additive:
// routine copy is byte-identical, emergency copy adds one notice line.

const brand: TenantBrand = {
  name: 'The NYC Maid',
  phone: '(212) 202-8400',
  site: 'thenycmaid.com',
  bookUrl: 'thenycmaid.com/book',
  reviewUrl: null,
  defaultRate: 0,
}

const routine = { start_time: '2026-08-01T13:00:00' }
const emergency = { ...routine, is_emergency: true }

describe('sms-cleaning reschedule — emergency wording', () => {
  it('routine reschedule keeps byte-identical copy (no emergency notice)', () => {
    const body = reschedule(brand, routine)
    expect(body).not.toContain('emergency')
    expect(body).toContain('Your cleaning has been rescheduled')
  })

  it('reschedule that becomes an emergency adds an emergency-rate notice', () => {
    const body = reschedule(brand, emergency)
    expect(body).toContain('same-day/emergency booking')
    expect(body).toContain('emergency rate applies')
  })

  it('rescheduleES mirrors the same behavior in Spanish', () => {
    expect(rescheduleES(brand, routine)).not.toContain('emergencia')
    const body = rescheduleES(brand, emergency)
    expect(body).toContain('emergencia el mismo día')
    expect(body).toContain('tarifa de emergencia')
  })
})
