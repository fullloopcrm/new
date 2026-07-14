import { describe, it, expect } from 'vitest'
import { clientBilledHours, cleanerPaidHours } from './billing-hours'

/**
 * Half-hour rounding for BILLING (client) vs PAY (cleaner). The whole reason
 * this module exists is that the two use DIFFERENT grace windows — client rounds
 * up past 10 min, cleaner only past 15 min — and copy-pasted drift once caused
 * cleaners to be overpaid for running a few minutes over. The load-bearing
 * invariant: in the 10..15-min-over band the client is billed the extra half
 * hour but the cleaner is NOT. Both must always land on a clean .0 or .5.
 */

describe('clientBilledHours — 10-minute grace', () => {
  it('bills 0 half-hours at exactly the grace edge (10 min)', () => {
    // 10 min is NOT past 10 → stays at 0.0
    expect(clientBilledHours(10)).toBe(0)
  })

  it('rounds up to 0.5 once past 10 min (11 min)', () => {
    expect(clientBilledHours(11)).toBe(0.5)
  })

  it('exact half-hour multiples do not round up (30 → 0.5, 60 → 1.0)', () => {
    expect(clientBilledHours(30)).toBe(0.5)
    expect(clientBilledHours(60)).toBe(1)
  })

  it('41 min → 1.0 (past the 10-min grace into the 2nd block)', () => {
    // 41 = one full 30 block + 11 remainder; 11 > 10 grace → round up
    expect(clientBilledHours(41)).toBe(1)
  })

  it('40 min → 0.5 (10 remainder is not PAST 10)', () => {
    expect(clientBilledHours(40)).toBe(0.5)
  })

  it('clamps negatives to 0', () => {
    expect(clientBilledHours(-5)).toBe(0)
  })
})

describe('cleanerPaidHours — 15-minute grace', () => {
  it('does NOT round up at 15 min (grace edge)', () => {
    expect(cleanerPaidHours(15)).toBe(0)
  })

  it('rounds up to 0.5 once past 15 min (16 min)', () => {
    expect(cleanerPaidHours(16)).toBe(0.5)
  })

  it('45 min → 0.5 (remainder 15 is not PAST 15)', () => {
    expect(cleanerPaidHours(45)).toBe(0.5)
  })

  it('46 min → 1.0 (remainder 16 rounds up)', () => {
    expect(cleanerPaidHours(46)).toBe(1)
  })
})

describe('billing-hours — client vs cleaner grace divergence', () => {
  it('in the 10<x<=15 over-band, client bills the extra half hour but cleaner does not', () => {
    // 2h12m: 4 full half-hours + 12 min remainder.
    const raw = 132
    expect(clientBilledHours(raw)).toBe(2.5) // 12 > 10 grace → rounds up
    expect(cleanerPaidHours(raw)).toBe(2.0) // 12 <= 15 grace → does NOT round up
  })

  it('past 15 min over, both round up (cleaner grace also crossed)', () => {
    const raw = 136 // remainder 16
    expect(clientBilledHours(raw)).toBe(2.5)
    expect(cleanerPaidHours(raw)).toBe(2.5)
  })

  it('under both graces, neither rounds up', () => {
    const raw = 128 // remainder 8
    expect(clientBilledHours(raw)).toBe(2.0)
    expect(cleanerPaidHours(raw)).toBe(2.0)
  })

  it('at 41 min the client is billed 1.0h but the cleaner is paid 0.5h', () => {
    // The core reason the module exists: a few minutes over earns the client a
    // charge (past 10) but NOT the cleaner (not past 15). If the two grace
    // windows are ever collapsed, these two values become equal and this fails.
    expect(clientBilledHours(41)).toBe(1)
    expect(cleanerPaidHours(41)).toBe(0.5)
    expect(clientBilledHours(41)).not.toBe(cleanerPaidHours(41))
  })
})

describe('billing-hours — grace boundaries are strict (> not >=)', () => {
  it('client: exactly 10 min over does NOT round up; 11 does', () => {
    expect(clientBilledHours(40)).toBe(0.5) // remainder 10, 10 > 10 is false
    expect(clientBilledHours(41)).toBe(1.0) // remainder 11
  })

  it('cleaner: exactly 15 min over does NOT round up; 16 does', () => {
    expect(cleanerPaidHours(45)).toBe(0.5) // remainder 15, 15 > 15 is false
    expect(cleanerPaidHours(46)).toBe(1.0) // remainder 16
  })
})

describe('billing-hours — always lands on a half-hour grid', () => {
  it.each([0, 5, 10, 15, 29, 30, 44, 59, 60, 137, 600])(
    'both helpers return a multiple of 0.5 for %i raw minutes',
    (m) => {
      for (const v of [clientBilledHours(m), cleanerPaidHours(m)]) {
        expect(v % 0.5).toBe(0)
        expect(v).toBeGreaterThanOrEqual(0)
      }
    },
  )

  it('clamps negative/zero minutes to 0 (no negative billing or pay)', () => {
    expect(clientBilledHours(0)).toBe(0)
    expect(cleanerPaidHours(0)).toBe(0)
    expect(clientBilledHours(-30)).toBe(0)
    expect(cleanerPaidHours(-999)).toBe(0)
  })

  it('exact half-hour multiples never over-round for either party', () => {
    expect(clientBilledHours(30)).toBe(0.5)
    expect(cleanerPaidHours(30)).toBe(0.5)
    expect(clientBilledHours(60)).toBe(1.0)
    expect(cleanerPaidHours(60)).toBe(1.0)
  })
})
