import { describe, it, expect } from 'vitest'
import { isTenantAiAway, type SupportHours } from './comhub-away'

// nycmaid's real configured schedule: staffed 08:00-20:00 every day.
const STAFFED_8_TO_20: SupportHours = {
  mon: { open: true, start: '08:00', end: '20:00' },
  tue: { open: true, start: '08:00', end: '20:00' },
  wed: { open: true, start: '08:00', end: '20:00' },
  thu: { open: true, start: '08:00', end: '20:00' },
  fri: { open: true, start: '08:00', end: '20:00' },
  sat: { open: true, start: '08:00', end: '20:00' },
  sun: { open: true, start: '08:00', end: '20:00' },
}

// 2026-07-22 is a Wednesday. EDT (UTC-4) is in effect in July.
const WED_NOON_ET = new Date('2026-07-22T16:00:00Z') // 12:00 ET — mid support hours
const WED_2AM_ET = new Date('2026-07-22T06:00:00Z') // 02:00 ET — overnight
const WED_759AM_ET = new Date('2026-07-22T11:59:00Z') // 07:59 ET — one minute before open
const WED_8AM_ET = new Date('2026-07-22T12:00:00Z') // 08:00 ET — window opens (inclusive)
const WED_759PM_ET = new Date('2026-07-22T23:59:00Z') // 19:59 ET — one minute before close
const WED_8PM_ET = new Date('2026-07-23T00:00:00Z') // 20:00 ET — window closes (exclusive)

describe('isTenantAiAway', () => {
  it('is NOT away during configured support hours', () => {
    expect(isTenantAiAway({ timezone: 'America/New_York', supportHours: STAFFED_8_TO_20, at: WED_NOON_ET })).toBe(false)
  })

  it('is away overnight, outside support hours', () => {
    expect(isTenantAiAway({ timezone: 'America/New_York', supportHours: STAFFED_8_TO_20, at: WED_2AM_ET })).toBe(true)
  })

  it('treats the start boundary as inclusive (staffed) and the minute before as away', () => {
    expect(isTenantAiAway({ timezone: 'America/New_York', supportHours: STAFFED_8_TO_20, at: WED_759AM_ET })).toBe(true)
    expect(isTenantAiAway({ timezone: 'America/New_York', supportHours: STAFFED_8_TO_20, at: WED_8AM_ET })).toBe(false)
  })

  it('treats the end boundary as exclusive (away) and the minute before as staffed', () => {
    expect(isTenantAiAway({ timezone: 'America/New_York', supportHours: STAFFED_8_TO_20, at: WED_759PM_ET })).toBe(false)
    expect(isTenantAiAway({ timezone: 'America/New_York', supportHours: STAFFED_8_TO_20, at: WED_8PM_ET })).toBe(true)
  })

  it('manual override forces away even mid support-hours', () => {
    expect(isTenantAiAway({ timezone: 'America/New_York', supportHours: STAFFED_8_TO_20, manualAway: true, at: WED_NOON_ET })).toBe(true)
  })

  it('a day marked closed is away all day', () => {
    const closedSunday: SupportHours = { ...STAFFED_8_TO_20, sun: { open: false, start: '08:00', end: '20:00' } }
    const sundayNoonEt = new Date('2026-07-26T16:00:00Z') // Sunday noon ET
    expect(isTenantAiAway({ timezone: 'America/New_York', supportHours: closedSunday, at: sundayNoonEt })).toBe(true)
  })

  it('defaults to always-away (unrestricted, current behavior) when no schedule is configured', () => {
    expect(isTenantAiAway({ timezone: 'America/New_York', supportHours: null, at: WED_NOON_ET })).toBe(true)
    expect(isTenantAiAway({ timezone: 'America/New_York', supportHours: {}, at: WED_NOON_ET })).toBe(true)
  })

  it('respects DST — same wall-clock hour, different UTC offset in winter', () => {
    // 2026-01-21 is a Wednesday. EST (UTC-5) in January.
    const winterNoonEt = new Date('2026-01-21T17:00:00Z') // 12:00 ET in EST
    expect(isTenantAiAway({ timezone: 'America/New_York', supportHours: STAFFED_8_TO_20, at: winterNoonEt })).toBe(false)
  })
})
