import { describe, it, expect } from 'vitest'
import { clientArrivalWindow } from './time-window'

/**
 * Client-facing 2-hour arrival window. `start_time` is stored as a naive
 * `timestamp without time zone` column whose digits ARE the intended ET
 * wall-clock time (e.g. "2026-06-25T13:00:00" means 1:00 PM ET) — Supabase/
 * PostgREST serializes it with no 'Z'/offset. clientArrivalWindow must read
 * those digits directly, NOT route them through `new Date()` + Intl timezone
 * conversion (that treats the naive digits as a real UTC instant and shifts
 * the displayed window 4-5 hours earlier than what was actually booked —
 * the exact bug a live client hit: see fl-confirm-email-investigate-2026-07-23).
 */
describe('clientArrivalWindow', () => {
  it('reads a naive ET string\'s digits directly (13:00 → 1:00 PM to 3:00 PM)', () => {
    const win = clientArrivalWindow('2026-06-25T13:00:00')
    const [start, end] = win.split('–') // en dash separator
    expect(start).toBe('1:00 PM')
    expect(end).toBe('3:00 PM')
  })

  it('the two endpoints are exactly 2 hours apart', () => {
    const win = clientArrivalWindow('2026-06-25T13:00:00')
    expect(win).toContain('1:00 PM')
    expect(win).toContain('3:00 PM')
  })

  it('produces a start-end range with an en dash', () => {
    const win = clientArrivalWindow('2026-06-25T16:00:00') // 4:00 PM
    expect(win).toContain('–')
    expect(win).toContain('4:00 PM')
    expect(win).toContain('6:00 PM')
  })

  it('does NOT re-apply an America/New_York conversion on top of the naive digits', () => {
    // This is the regression case from the live bug: an 8:00 AM booking must
    // display as 8:00 AM-10:00 AM, never shifted to 4:00 AM-6:00 AM.
    const win = clientArrivalWindow('2026-07-24T08:00:00')
    expect(win).toBe('8:00 AM–10:00 AM')
  })

  it('accepts a Date object and reads the same wall-clock digits via toISOString', () => {
    const win = clientArrivalWindow(new Date('2026-06-25T13:00:00.000Z'))
    expect(win).toBe('1:00 PM–3:00 PM')
  })

  it('wraps past midnight correctly', () => {
    const win = clientArrivalWindow('2026-06-25T23:00:00')
    expect(win).toBe('11:00 PM–1:00 AM')
  })
})
