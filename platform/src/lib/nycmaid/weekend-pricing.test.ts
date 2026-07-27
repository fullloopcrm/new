import { describe, it, expect } from 'vitest'
import { isWeekendDate, weekendHourlyRate, WEEKEND_CLIENT_SUPPLIES_RATE, WEEKEND_SUPPLIES_PROVIDED_RATE, WEEKEND_EMERGENCY_RATE } from './weekend-pricing'

describe('isWeekendDate', () => {
  it('Saturday is a weekend day', () => {
    expect(isWeekendDate('2026-08-01')).toBe(true)
  })

  it('Sunday is a weekend day', () => {
    expect(isWeekendDate('2026-08-02')).toBe(true)
  })

  it('Friday is NOT a weekend day', () => {
    expect(isWeekendDate('2026-08-07')).toBe(false)
  })

  it('Monday is NOT a weekend day', () => {
    expect(isWeekendDate('2026-08-03')).toBe(false)
  })

  it('a plain weekday date string is not a weekend day', () => {
    // 2026-01-01 is a Thursday.
    expect(isWeekendDate('2026-01-01')).toBe(false)
  })
})

describe('weekendHourlyRate', () => {
  it('emergency (same-day / under-48hr multi-cleaner) always wins, regardless of supplies choice', () => {
    expect(weekendHourlyRate('we_bring', true)).toBe(WEEKEND_EMERGENCY_RATE)
    expect(weekendHourlyRate('client', true)).toBe(WEEKEND_EMERGENCY_RATE)
    expect(WEEKEND_EMERGENCY_RATE).toBe(99)
  })

  it('we_bring (our supplies) is $79/hr when not emergency', () => {
    expect(weekendHourlyRate('we_bring', false)).toBe(WEEKEND_SUPPLIES_PROVIDED_RATE)
    expect(WEEKEND_SUPPLIES_PROVIDED_RATE).toBe(79)
  })

  it('client (their supplies) is $69/hr when not emergency', () => {
    expect(weekendHourlyRate('client', false)).toBe(WEEKEND_CLIENT_SUPPLIES_RATE)
    expect(WEEKEND_CLIENT_SUPPLIES_RATE).toBe(69)
  })
})
