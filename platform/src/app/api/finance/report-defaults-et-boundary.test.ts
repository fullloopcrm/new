/**
 * Finance report routes (summary, pnl, trial-balance, balance-sheet,
 * payroll-prep) default their "from"/"to"/"as_of"/"year" range params via
 * the server's UTC calendar instead of ET, while every column they query --
 * journal_entries.entry_date and bookings.start_time -- is naive-ET.
 *
 * finance/summary was a SELF-REGRESSION: it was fixed once already (04:53
 * this session) on the deliberate, then-correct assumption that entry_date
 * was written from a UTC calendar date. A later fix in this same session
 * (post-revenue.ts/post-labor.ts/post-adjustments.ts, ~06:38) switched
 * entry_date's write side to nowNaiveET() (ET) without updating this
 * route's read-side boundary, silently reopening the mismatch this test
 * guards against.
 *
 * Near the ET/UTC gap (~4-5h) every evening, and worse at month/year
 * boundaries (UTC's calendar day/month/year rolls over before ET's), a
 * UTC-anchored default silently shows the wrong period -- most visibly the
 * wrong month's P&L/payroll on the last evening of every month, and an
 * empty/backwards YTD trial balance on Dec 31 evening.
 *
 * Forces `process.env.TZ = 'UTC'` to simulate Vercel's actual runtime --
 * this sandbox's own local TZ (America/New_York) would otherwise make the
 * OLD buggy code accidentally behave correctly by coincidence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ledgerRangesET } from './summary/route'
import { monthRangeET as pnlMonthRangeET } from './pnl/route'
import { monthRangeET as payrollMonthRangeET } from './payroll-prep/route'
import { yearStart as trialBalanceYearStart } from './trial-balance/route'
import { nowNaiveET } from '@/lib/recurring'

const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  process.env.TZ = realTZ
})

describe('finance report defaults -- last evening of the month (ET), real UTC already next month', () => {
  // 2026-07-31 23:30 EDT (UTC-4) == 2026-08-01 03:30 UTC. ET calendar day is
  // still Jul 31; a UTC-calendar default would read Aug 1.
  beforeEach(() => vi.setSystemTime(new Date('2026-08-01T03:30:00Z')))

  it('pnl monthRangeET() stays in July, not August', () => {
    expect(pnlMonthRangeET()).toEqual({ from: '2026-07-01', to: '2026-07-31' })
  })

  it('payroll-prep monthRangeET() stays in July, not August', () => {
    expect(payrollMonthRangeET()).toEqual({ from: '2026-07-01', to: '2026-07-31' })
  })

  it('summary ledgerRangesET() month bound stays in July', () => {
    expect(ledgerRangesET().month).toEqual(['2026-07-01', '2026-07-31'])
  })

  it('summary ledgerRangesET() week bound is the real ET week (Mon Jul 27 - Mon Aug 3 exclusive)', () => {
    expect(ledgerRangesET().week).toEqual(['2026-07-27', '2026-08-03'])
  })
})

describe('finance report defaults -- Dec 31 evening ET, real UTC already next year', () => {
  // 2026-12-31 23:30 EST (UTC-5) == 2027-01-01 04:30 UTC. ET calendar day/
  // year is still 2026; a UTC-calendar default would read 2027.
  beforeEach(() => vi.setSystemTime(new Date('2027-01-01T04:30:00Z')))

  it('trial-balance yearStart() stays in 2026, not 2027', () => {
    expect(trialBalanceYearStart()).toBe('2026-01-01')
  })

  it('trial-balance implicit "to" default (nowNaiveET) reads Dec 31 2026, not Jan 1 2027', () => {
    expect(nowNaiveET().slice(0, 10)).toBe('2026-12-31')
  })

  it('summary ledgerRangesET() year bound stays [2026-01-01, 2026-12-31]', () => {
    expect(ledgerRangesET().year).toEqual(['2026-01-01', '2026-12-31'])
  })

  it('summary ledgerRangesET() month bound stays in December 2026', () => {
    expect(ledgerRangesET().month).toEqual(['2026-12-01', '2026-12-31'])
  })

  it('pnl/payroll-prep monthRangeET() both stay in December 2026', () => {
    expect(pnlMonthRangeET()).toEqual({ from: '2026-12-01', to: '2026-12-31' })
    expect(payrollMonthRangeET()).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })

  it('summary ledgerRangesET() week bound is the real ET week (Mon Dec 28 - Mon Jan 4 exclusive)', () => {
    expect(ledgerRangesET().week).toEqual(['2026-12-28', '2027-01-04'])
  })
})

describe('finance report defaults -- mid-day, non-boundary sanity check', () => {
  beforeEach(() => vi.setSystemTime(new Date('2026-07-15T18:00:00Z'))) // 2pm ET

  it('pnl/payroll-prep monthRangeET() land on July with no boundary in play', () => {
    expect(pnlMonthRangeET()).toEqual({ from: '2026-07-01', to: '2026-07-31' })
    expect(payrollMonthRangeET()).toEqual({ from: '2026-07-01', to: '2026-07-31' })
  })

  it('trial-balance yearStart() is 2026-01-01', () => {
    expect(trialBalanceYearStart()).toBe('2026-01-01')
  })
})
