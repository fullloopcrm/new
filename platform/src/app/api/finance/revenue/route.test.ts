/**
 * Characterization tests for finance/revenue GET — period-boundary selection
 * and the monthly-trend/forecast composition. Coverage before this file:
 * 37.74% statements.
 *
 * ledgerProfitAndLoss is mocked (its own income/expense math is covered at
 * 92%+ by ledger-reports.test.ts) so this file isolates the ROUTE's own
 * logic: which date range each `period` value produces, and how the
 * monthly/forecast array is built from a sequence of per-month ledger calls.
 * tenant-time helpers run for REAL against a fixed clock (vi.useFakeTimers)
 * rather than being mocked, so the date-boundary math is genuinely exercised,
 * not assumed.
 *
 * Fixed "now": 2026-07-15T18:00:00Z = July 15, 2026, 14:00 in the default
 * America/New_York tenant timezone — safely mid-day, no midnight-boundary
 * edge cases.
 *
 * Pins:
 *   - period=today -> dateFrom is the start of today (tenant-local)
 *   - period=week -> dateFrom is exactly 7 days back
 *   - period=month (default) -> dateFrom is the 1st of the current month
 *   - any other period value (e.g. "year") -> YTD, dateFrom is Jan 1
 *   - booking_count reflects only bookings.payment_status='paid' with
 *     payment_date >= dateFrom (tenantDb-scoped)
 *   - monthly=true: actual is null for months after the current one
 *     (isPending), forecast = average of completed months (strictly BEFORE
 *     the current, in-progress month) for the current+pending months only,
 *     ytdActual sums all actuals-so-far, projectedFullYearRevenue =
 *     ytdActual + avgCompleted*pendingCount
 *   - an auth failure short-circuits before any query
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const requirePermissionMock = vi.hoisted(() =>
  vi.fn(
    async (): Promise<
      | { tenant: { userId: string; tenantId: string; tenant: { id: string; timezone: null }; role: string }; error: null }
      | { tenant: null; error: Response }
    > => ({
      tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT, timezone: null }, role: 'owner' },
      error: null,
    }),
  ),
)
vi.mock('@/lib/require-permission', () => ({ requirePermission: requirePermissionMock }))

const ledgerProfitAndLossMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/finance/ledger-reports', () => ({ ledgerProfitAndLoss: ledgerProfitAndLossMock }))

import { GET } from './route'

let h: Harness
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-15T18:00:00.000Z'))
  requirePermissionMock.mockImplementation(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT, timezone: null }, role: 'owner' },
    error: null,
  }))
  ledgerProfitAndLossMock.mockReset()
  ledgerProfitAndLossMock.mockResolvedValue({ revenue_cents: 0 })
  h = createTenantDbHarness({ bookings: [] })
  holder.from = h.from
})

afterEach(() => {
  vi.useRealTimers()
})

function getReq(qs = ''): NextRequest {
  return new NextRequest(`http://t/api/finance/revenue${qs}`)
}

describe('GET /api/finance/revenue — period boundaries', () => {
  it('short-circuits on an auth failure', async () => {
    const authError = new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    requirePermissionMock.mockImplementationOnce(async () => ({ tenant: null, error: authError }))
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })

  it('period=today: dateFrom is the start of today (tenant-local)', async () => {
    await GET(getReq('?period=today'))
    const [, from, to] = ledgerProfitAndLossMock.mock.calls[0]
    expect(from).toBe('2026-07-15')
    expect(to).toBe('2026-07-15')
  })

  it('period=week: dateFrom is exactly 7 days back', async () => {
    await GET(getReq('?period=week'))
    const [, from] = ledgerProfitAndLossMock.mock.calls[0]
    expect(from).toBe('2026-07-08')
  })

  it('period=month (default when omitted): dateFrom is the 1st of the current month', async () => {
    await GET(getReq())
    const [, from] = ledgerProfitAndLossMock.mock.calls[0]
    expect(from).toBe('2026-07-01')
  })

  it('any other period value falls back to YTD: dateFrom is Jan 1', async () => {
    await GET(getReq('?period=year'))
    const [, from] = ledgerProfitAndLossMock.mock.calls[0]
    expect(from).toBe('2026-01-01')
  })

  it('total_revenue comes from the ledger, booking_count from paid bookings in range', async () => {
    ledgerProfitAndLossMock.mockResolvedValueOnce({ revenue_cents: 55000 })
    h.seed.bookings.push(
      { tenant_id: CTX_TENANT, price: 10000, payment_date: '2026-07-10T00:00:00Z', payment_status: 'paid' },
      { tenant_id: CTX_TENANT, price: 5000, payment_date: '2026-07-11T00:00:00Z', payment_status: 'pending' }, // excluded: not paid
    )
    const res = await GET(getReq('?period=month'))
    const body = await res.json()
    expect(body).toMatchObject({ period: 'month', total_revenue: 55000, booking_count: 1 })
  })
})

describe('GET /api/finance/revenue?monthly=true — forecast composition', () => {
  it('builds actual/forecast/pending correctly and computes ytdActual + projectedFullYearRevenue', async () => {
    // One ledgerProfitAndLoss call per month Jan..Jul (currentMonthIndex=6, 0-indexed July)
    // plus one more for the headline (non-monthly) total = 8 calls total.
    // Give each MONTHLY call a revenue proportional to (month+1)*10000 cents,
    // identified by the 2-digit month in the `from` argument ("2026-0M-01").
    ledgerProfitAndLossMock.mockImplementation(async (_tid: string, from: string) => {
      const month = Number(from.slice(5, 7))
      return { revenue_cents: month * 10000 }
    })

    const res = await GET(getReq('?monthly=true'))
    const body = await res.json()

    expect(body.monthly).toHaveLength(12)
    // Jan(index0)..Jun(index5): actual present, not pending/current.
    for (let m = 0; m <= 5; m++) {
      expect(body.monthly[m]).toMatchObject({ actual: (m + 1) * 100, isPending: false, isCurrent: false })
    }
    // Jul (index 6): the in-progress current month — has an actual (not pending)
    // but ALSO carries the forecast, per the source's isCurrent||isPending check.
    expect(body.monthly[6]).toMatchObject({ actual: 700, isCurrent: true, isPending: false })
    // avgCompleted = average of Jan..Jun actuals = (100+200+300+400+500+600)/6 = 350
    expect(body.monthly[6].forecast).toBe(350)
    // Aug(index7)..Dec(index11): pending, no actual, same forecast.
    for (let m = 7; m <= 11; m++) {
      expect(body.monthly[m]).toMatchObject({ actual: null, isPending: true, forecast: 350 })
    }

    expect(body.forecastMethod).toBe('average of completed months this year')
    expect(body.ytdActual).toBe(2800) // sum of Jan..Jul actuals: 100+200+...+700
    expect(body.projectedFullYearRevenue).toBe(4550) // 2800 + 350*5 pending months
  })

  it('projectedFullYearRevenue is null in January (no completed months yet, avgCompleted is null)', async () => {
    vi.setSystemTime(new Date('2026-01-10T18:00:00.000Z'))
    ledgerProfitAndLossMock.mockResolvedValue({ revenue_cents: 5000 })
    const res = await GET(getReq('?monthly=true'))
    const body = await res.json()
    expect(body.monthly[0]).toMatchObject({ isCurrent: true, forecast: null })
    expect(body.projectedFullYearRevenue).toBeNull()
  })
})
