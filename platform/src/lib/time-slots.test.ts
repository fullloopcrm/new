import { describe, it, expect } from 'vitest'
import { hourToLabel, labelToHour, slotStartHours } from './time-slots'

describe('hourToLabel / labelToHour round-trip (F4)', () => {
  it('labels every hour of the day, incl. midnight/noon/evening', () => {
    expect(hourToLabel(0)).toBe('12:00 AM')
    expect(hourToLabel(9)).toBe('9:00 AM')
    expect(hourToLabel(12)).toBe('12:00 PM')
    expect(hourToLabel(16)).toBe('4:00 PM')
    expect(hourToLabel(19)).toBe('7:00 PM')
    expect(hourToLabel(23)).toBe('11:00 PM')
  })

  it('parses its own labels back to the hour (0-23)', () => {
    for (let h = 0; h < 24; h++) {
      expect(labelToHour(hourToLabel(h))).toBe(h)
    }
  })

  it('parses 24-hour and loose forms; null when unparseable', () => {
    expect(labelToHour('19:00')).toBe(19)
    expect(labelToHour('7 PM')).toBe(19)
    expect(labelToHour('12:00 AM')).toBe(0)
    expect(labelToHour('')).toBeNull()
    expect(labelToHour('whenever')).toBeNull()
  })
})

describe('slotStartHours — per-tenant window (F4)', () => {
  it('legacy 9-17 tenant is unchanged (9am start, finishes by 5pm)', () => {
    // 2h jobs → 9..15; 1h jobs → 9..16 (last start 4pm). Matches prior behavior.
    expect(slotStartHours(9, 17, 2)).toEqual([9, 10, 11, 12, 13, 14, 15])
    expect(slotStartHours(9, 17, 1)).toEqual([9, 10, 11, 12, 13, 14, 15, 16])
  })

  it('a 24-7 emergency trade (0-24) can start any hour a full job fits', () => {
    const hours = slotStartHours(0, 24, 2)
    expect(hours[0]).toBe(0) // 12 AM
    expect(hours).toContain(19) // 7 PM available
    expect(hours).toContain(22) // 10 PM, finishes midnight
    expect(hours).not.toContain(23) // 11 PM start would run past midnight
  })

  it('honors a widened 8am-6pm window (the settings default)', () => {
    expect(slotStartHours(8, 18, 2)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16])
  })
})
