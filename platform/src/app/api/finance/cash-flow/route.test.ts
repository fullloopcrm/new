/**
 * advanceCursor() — cash-flow forecast's recurring-expense walk stepper.
 * See route.ts's advanceMonthly() comment for the bug this guards: chaining
 * setUTCMonth() off the previous cursor let one short month permanently
 * shift a month-end anchor day forward for the rest of the forecast walk.
 */
import { describe, it, expect } from 'vitest'
import { advanceCursor } from './route'

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

describe('advanceCursor — monthly (setUTCMonth day-of-month math)', () => {
  it('month-end (day 31) falls back to each short month\'s LAST day WITHOUT permanently drifting the anchor day', () => {
    // Old behavior: r.setUTCMonth(r.getUTCMonth() + 1) chained off the
    // previous cursor. A Jan-31 anchor's first advance overflowed Feb 31
    // into Mar 3, and every later advance chained off that corrupted Mar-3
    // baseline -- Mar 3 -> Apr 3 -> May 3 -> ..., permanently stuck at day
    // 3 for the rest of the forecast walk, never returning to 31.
    let current = new Date('2026-01-31')
    const seq: string[] = [ymd(current)]
    for (let i = 0; i < 7; i++) {
      current = advanceCursor(current, 'monthly', 31)
      seq.push(ymd(current))
    }
    expect(seq).toEqual([
      '2026-01-31',
      '2026-02-28', // Feb has no 31st -> falls back to Feb's last day
      '2026-03-31', // back to the real 31st, not permanently pinned at 28/3
      '2026-04-30', // Apr has no 31st -> falls back
      '2026-05-31', // back to 31
      '2026-06-30', // Jun has no 31st -> falls back
      '2026-07-31', // back to 31
      '2026-08-31',
    ])
  })

  it('self-heals a cursor already corrupted by the old chained-setUTCMonth bug instead of propagating the wrong day forward', () => {
    const corrupted = new Date('2026-03-03')
    const next = advanceCursor(corrupted, 'monthly', 31)
    expect(ymd(next)).toBe('2026-04-30')
  })

  it('leap-day anchor (day 29) resyncs to the 29th every leap-adjacent month, no throw on Feb in a non-leap year', () => {
    let current = new Date('2028-02-29') // 2028 is a leap year
    const seq: string[] = [ymd(current)]
    for (let i = 0; i < 3; i++) {
      current = advanceCursor(current, 'monthly', 29)
      seq.push(ymd(current))
    }
    expect(seq).toEqual(['2028-02-29', '2028-03-29', '2028-04-29', '2028-05-29'])
  })

  it('mid-month anchor (day 15, no month has fewer than 15 days) advances cleanly with no fallback ever needed', () => {
    let current = new Date('2026-01-15')
    current = advanceCursor(current, 'monthly', 15)
    expect(ymd(current)).toBe('2026-02-15')
    current = advanceCursor(current, 'monthly', 15)
    expect(ymd(current)).toBe('2026-03-15')
  })
})

describe('advanceCursor — quarterly (same day-of-month math, 3-month step)', () => {
  it('month-end (day 31) anchor cycles through short quarters without permanent drift', () => {
    let current = new Date('2026-01-31')
    const seq: string[] = [ymd(current)]
    for (let i = 0; i < 3; i++) {
      current = advanceCursor(current, 'quarterly', 31)
      seq.push(ymd(current))
    }
    // Jan 31 -> Apr 30 (Apr has no 31st) -> Jul 31 (back to 31) -> Oct 31
    expect(seq).toEqual(['2026-01-31', '2026-04-30', '2026-07-31', '2026-10-31'])
  })
})

describe('advanceCursor — non-monthly frequencies are unaffected by anchorDay', () => {
  it('daily/weekly/biweekly/yearly ignore anchorDay entirely (regression control)', () => {
    expect(ymd(advanceCursor(new Date('2026-01-31'), 'daily', 31))).toBe('2026-02-01')
    expect(ymd(advanceCursor(new Date('2026-01-31'), 'weekly', 31))).toBe('2026-02-07')
    expect(ymd(advanceCursor(new Date('2026-01-31'), 'biweekly', 31))).toBe('2026-02-14')
    expect(ymd(advanceCursor(new Date('2026-01-31'), 'yearly', 31))).toBe('2027-01-31')
    // anchorDay=1 (a value that WOULD change monthly/quarterly output) makes
    // no difference to any of these branches
    expect(ymd(advanceCursor(new Date('2026-01-31'), 'daily', 1))).toBe('2026-02-01')
  })

  it('unknown frequency falls back to +30 days, ignoring anchorDay', () => {
    expect(ymd(advanceCursor(new Date('2026-01-01'), 'bogus', 31))).toBe('2026-01-31')
  })
})
