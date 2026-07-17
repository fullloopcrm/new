import { describe, it, expect } from 'vitest'
import { isQuietHours } from './notify-team-member'

/**
 * notifyTeamMember() suppresses the push channel during a team member's
 * quiet hours (set as their own ET wall-clock time via the team dashboard).
 * isQuietHours() used to read `new Date().getHours()` -- the SERVER's local
 * clock (UTC on Vercel) -- instead of the ET clock, so the suppression
 * window was silently shifted by the ET/UTC gap (4h EDT / 5h EST).
 */
describe('isQuietHours — ET wall-clock, not server-local (UTC on Vercel)', () => {
  it('does NOT suppress push at 6pm ET even though the server clock (UTC) reads inside the 22:00-07:00 window', () => {
    // 22:00 UTC on a July date = 6:00pm EDT -- real work hours, not quiet.
    const sixPmET = new Date('2026-07-17T22:00:00.000Z')
    expect(isQuietHours('22:00', '07:00', sixPmET)).toBe(false)
  })

  it('DOES suppress push at 4am ET even though the server clock (UTC) reads outside the 22:00-07:00 window', () => {
    // 08:00 UTC on a July date = 4:00am EDT -- real overnight quiet hours.
    const fourAmET = new Date('2026-07-17T08:00:00.000Z')
    expect(isQuietHours('22:00', '07:00', fourAmET)).toBe(true)
  })

  it('does not suppress push at 1pm ET, well outside any quiet window', () => {
    const onePmET = new Date('2026-07-17T17:00:00.000Z')
    expect(isQuietHours('22:00', '07:00', onePmET)).toBe(false)
  })

  it('handles a same-day (non-midnight-spanning) quiet window in ET', () => {
    // 09:00-17:00 ET quiet window; 13:00 UTC on a July date = 9:00am EDT.
    const nineAmET = new Date('2026-07-17T13:00:00.000Z')
    expect(isQuietHours('09:00', '17:00', nineAmET)).toBe(true)
    // 21:00 UTC = 5:00pm EDT, the window's exclusive end.
    const fivePmET = new Date('2026-07-17T21:00:00.000Z')
    expect(isQuietHours('09:00', '17:00', fivePmET)).toBe(false)
  })
})
