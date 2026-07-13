import { describe, it, expect } from 'vitest'
import * as cleaning from './sms-cleaning'
import { ARRIVAL_WINDOW_NOTE_SMS, ARRIVAL_WINDOW_NOTE_ES } from '../time-window'
import type { TenantBrand } from './brand'

const brand: TenantBrand = {
  name: 'The NYC Maid',
  phone: '(212) 202-8400',
  site: 'thenycmaid.com',
  bookUrl: 'thenycmaid.com/book',
  reviewUrl: null,
  defaultRate: 0,
}

const booking = {
  start_time: '2026-08-01T13:00:00',
  team_size: 1,
}

describe('sms-cleaning rate fallback', () => {
  it('falls back to $69/hr, not $79, when a booking has no hourly_rate', () => {
    const body = cleaning.bookingReceived(brand, booking)
    expect(body).toContain('$69/hr')
    expect(body).not.toContain('$79/hr')
  })

  it('bookingConfirmed also falls back to $69/hr', () => {
    const body = cleaning.bookingConfirmed(brand, booking)
    expect(body).toContain('$69/hr')
    expect(body).not.toContain('$79/hr')
  })
})

describe('sms-cleaning arrival-window disclaimer parity', () => {
  it('bookingReceived includes the nycmaid arrival-window note', () => {
    expect(cleaning.bookingReceived(brand, booking)).toContain(ARRIVAL_WINDOW_NOTE_SMS)
  })

  it('bookingConfirmed includes the arrival-window note', () => {
    expect(cleaning.bookingConfirmed(brand, booking)).toContain(ARRIVAL_WINDOW_NOTE_SMS)
  })

  it('confirmationReminder includes the arrival-window note', () => {
    expect(cleaning.confirmationReminder(brand, booking)).toContain(ARRIVAL_WINDOW_NOTE_SMS)
  })

  it('bookingConfirmation includes the arrival-window note', () => {
    expect(cleaning.bookingConfirmation(brand, booking)).toContain(ARRIVAL_WINDOW_NOTE_SMS)
  })

  it('reminder includes the arrival-window note in both branches', () => {
    expect(cleaning.reminder(brand, booking, 'in 2 hours')).toContain(ARRIVAL_WINDOW_NOTE_SMS)
    expect(cleaning.reminder(brand, booking, 'tomorrow')).toContain(ARRIVAL_WINDOW_NOTE_SMS)
  })

  it('reschedule includes the arrival-window note', () => {
    expect(cleaning.reschedule(brand, booking)).toContain(ARRIVAL_WINDOW_NOTE_SMS)
  })

  it('Spanish templates include the Spanish arrival-window note', () => {
    expect(cleaning.bookingConfirmationES(brand, booking)).toContain(ARRIVAL_WINDOW_NOTE_ES)
    expect(cleaning.reminderES(brand, booking, 'in 2 hours')).toContain(ARRIVAL_WINDOW_NOTE_ES)
    expect(cleaning.reminderES(brand, booking, 'tomorrow')).toContain(ARRIVAL_WINDOW_NOTE_ES)
    expect(cleaning.rescheduleES(brand, booking)).toContain(ARRIVAL_WINDOW_NOTE_ES)
  })
})
