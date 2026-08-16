import { describe, it, expect } from 'vitest'
import { isTenantAiOnline, type SupportHours } from './comhub-away'

// nycmaid's real configured schedule: Yinez on 08:00-20:00 every day.
const ON_8_TO_20: SupportHours = {
  mon: { open: true, start: '08:00', end: '20:00' },
  tue: { open: true, start: '08:00', end: '20:00' },
  wed: { open: true, start: '08:00', end: '20:00' },
  thu: { open: true, start: '08:00', end: '20:00' },
  fri: { open: true, start: '08:00', end: '20:00' },
  sat: { open: true, start: '08:00', end: '20:00' },
  sun: { open: true, start: '08:00', end: '20:00' },
}

// 2026-07-22 is a Wednesday. EDT (UTC-4) is in effect in July.
const WED_NOON_ET = new Date('2026-07-22T16:00:00Z') // 12:00 ET — mid on-hours
const WED_2AM_ET = new Date('2026-07-22T06:00:00Z') // 02:00 ET — overnight
const WED_759AM_ET = new Date('2026-07-22T11:59:00Z') // 07:59 ET — one minute before open
const WED_8AM_ET = new Date('2026-07-22T12:00:00Z') // 08:00 ET — window opens (inclusive)
const WED_759PM_ET = new Date('2026-07-22T23:59:00Z') // 19:59 ET — one minute before close
const WED_8PM_ET = new Date('2026-07-23T00:00:00Z') // 20:00 ET — window closes (exclusive)

describe('isTenantAiOnline', () => {
  it('is online during configured hours when the switch is on', () => {
    expect(isTenantAiOnline({ timezone: 'America/New_York', supportHours: ON_8_TO_20, hoursEnabled: true, at: WED_NOON_ET })).toBe(true)
  })

  it('is offline overnight, outside configured hours, when the switch is on', () => {
    expect(isTenantAiOnline({ timezone: 'America/New_York', supportHours: ON_8_TO_20, hoursEnabled: true, at: WED_2AM_ET })).toBe(false)
  })

  it('treats the start boundary as inclusive (online) and the minute before as offline', () => {
    expect(isTenantAiOnline({ timezone: 'America/New_York', supportHours: ON_8_TO_20, hoursEnabled: true, at: WED_759AM_ET })).toBe(false)
    expect(isTenantAiOnline({ timezone: 'America/New_York', supportHours: ON_8_TO_20, hoursEnabled: true, at: WED_8AM_ET })).toBe(true)
  })

  it('treats the end boundary as exclusive (offline) and the minute before as online', () => {
    expect(isTenantAiOnline({ timezone: 'America/New_York', supportHours: ON_8_TO_20, hoursEnabled: true, at: WED_759PM_ET })).toBe(true)
    expect(isTenantAiOnline({ timezone: 'America/New_York', supportHours: ON_8_TO_20, hoursEnabled: true, at: WED_8PM_ET })).toBe(false)
  })

  it('a day marked closed is offline all day when the switch is on', () => {
    const closedSunday: SupportHours = { ...ON_8_TO_20, sun: { open: false, start: '08:00', end: '20:00' } }
    const sundayNoonEt = new Date('2026-07-26T16:00:00Z') // Sunday noon ET
    expect(isTenantAiOnline({ timezone: 'America/New_York', supportHours: closedSunday, hoursEnabled: true, at: sundayNoonEt })).toBe(false)
  })

  it('is always online when the switch is off, regardless of hours', () => {
    expect(isTenantAiOnline({ timezone: 'America/New_York', supportHours: ON_8_TO_20, hoursEnabled: false, at: WED_2AM_ET })).toBe(true)
  })

  it('defaults to always-online (unrestricted, current behavior) when the switch is on but no schedule is configured', () => {
    expect(isTenantAiOnline({ timezone: 'America/New_York', supportHours: null, hoursEnabled: true, at: WED_NOON_ET })).toBe(true)
    expect(isTenantAiOnline({ timezone: 'America/New_York', supportHours: {}, hoursEnabled: true, at: WED_NOON_ET })).toBe(true)
  })

  it('respects DST — same wall-clock hour, different UTC offset in winter', () => {
    // 2026-01-21 is a Wednesday. EST (UTC-5) in January.
    const winterNoonEt = new Date('2026-01-21T17:00:00Z') // 12:00 ET in EST
    expect(isTenantAiOnline({ timezone: 'America/New_York', supportHours: ON_8_TO_20, hoursEnabled: true, at: winterNoonEt })).toBe(true)
  })
})
