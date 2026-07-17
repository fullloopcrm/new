/**
 * generateInvoiceNumber() read the SERVER's UTC calendar month
 * (now.getUTCFullYear()/getUTCMonth()) instead of ET, while every other
 * date-of-record in this codebase is ET (see recurring.ts's etToday()
 * header). An invoice generated in the evening ET on the last day of any
 * month (e.g. Jul 31 9pm ET == Aug 1 UTC) got numbered into the month that
 * hadn't arrived yet in ET (INV-202608-0001 while due_date/every other
 * system still says July) -- and its sequence count restarted early since
 * the created_at window compared against real UTC-August rows instead of
 * the July ones that actually exist so far.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as
 * report-defaults-et-boundary.test.ts) to simulate Vercel's actual runtime
 * -- this sandbox's own local TZ (America/New_York) would otherwise make
 * the OLD buggy code accidentally behave correctly by coincidence.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

let capturedGte: string | undefined
let capturedLt: string | undefined
let mockCount = 0

vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        gte: (_col: string, val: string) => { capturedGte = val; return chain },
        lt: (_col: string, val: string) => { capturedLt = val; return chain },
        then: (resolve: (v: { count: number; error: null }) => void) => resolve({ count: mockCount, error: null }),
      }
      return chain
    },
  },
}))

import { generateInvoiceNumber } from './invoice'

const realTZ = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  capturedGte = undefined
  capturedLt = undefined
  mockCount = 3
})

afterEach(() => {
  vi.useRealTimers()
  process.env.TZ = realTZ
})

describe('generateInvoiceNumber -- last evening of the month (ET), real UTC already next month', () => {
  // 2026-07-31 23:30 EDT (UTC-4) == 2026-08-01 03:30 UTC. ET calendar day is
  // still Jul 31; a UTC-calendar default would number this into August.
  beforeEach(() => vi.setSystemTime(new Date('2026-08-01T03:30:00Z')))

  it('numbers the invoice into July, not August', async () => {
    const num = await generateInvoiceNumber('tenant-A')
    expect(num).toBe('INV-202607-0004')
  })

  it('queries created_at against the July ET-month window, not the UTC-August one', async () => {
    await generateInvoiceNumber('tenant-A')
    expect(capturedGte).toBe(new Date('2026-07-01T04:00:00.000Z').toISOString())
    expect(capturedLt).toBe(new Date('2026-08-01T04:00:00.000Z').toISOString())
  })
})

describe('generateInvoiceNumber -- Dec 31 evening ET, real UTC already next year', () => {
  // 2026-12-31 23:30 EST (UTC-5) == 2027-01-01 04:30 UTC.
  beforeEach(() => vi.setSystemTime(new Date('2027-01-01T04:30:00Z')))

  it('numbers the invoice into December 2026, not January 2027', async () => {
    const num = await generateInvoiceNumber('tenant-A')
    expect(num).toBe('INV-202612-0004')
  })
})

describe('generateInvoiceNumber -- mid-day, non-boundary sanity check', () => {
  beforeEach(() => vi.setSystemTime(new Date('2026-07-15T18:00:00Z'))) // 2pm ET

  it('numbers the invoice into July with no boundary in play', async () => {
    const num = await generateInvoiceNumber('tenant-A')
    expect(num).toBe('INV-202607-0004')
  })
})
