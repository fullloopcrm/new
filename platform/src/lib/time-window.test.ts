import { describe, it, expect } from 'vitest'
import { clientArrivalWindow } from './time-window'

/**
 * Client-facing 2-hour arrival window. The exact start time is turned into a
 * "start–(start+2h)" range rendered in America/New_York. Tests assert the exact
 * formatted times, so changing the window length (2h) or the timezone trips them.
 * ICU inserts a narrow no-break space before AM/PM, so we normalize whitespace
 * before the exact-value assertion (keeps it precise but not brittle to glyphs).
 */
const norm = (s: string) => s.replace(/\s/g, ' ')

describe('clientArrivalWindow', () => {
  it('formats a 2-hour window in Eastern Time (17:00Z → 1:00 PM to 3:00 PM EDT)', () => {
    // June 25 2026 17:00 UTC = 1:00 PM EDT; +2h = 3:00 PM.
    const win = norm(clientArrivalWindow(new Date('2026-06-25T17:00:00Z')))
    const [start, end] = win.split('–') // en dash separator
    expect(start).toBe('1:00 PM')
    expect(end).toBe('3:00 PM')
  })

  it('the two endpoints are exactly 2 hours apart', () => {
    const win = norm(clientArrivalWindow(new Date('2026-06-25T17:00:00Z')))
    expect(win).toContain('1:00 PM')
    expect(win).toContain('3:00 PM')
  })

  it('accepts a Date and produces a start-end range with an en dash', () => {
    const win = norm(clientArrivalWindow(new Date('2026-06-25T20:00:00Z'))) // 4:00 PM EDT
    expect(win).toContain('–')
    expect(win).toContain('4:00 PM')
    expect(win).toContain('6:00 PM')
  })
})
