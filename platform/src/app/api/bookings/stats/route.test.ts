import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'
import { nowNaiveET } from '@/lib/recurring'

/**
 * GET /api/bookings/stats — day-boundary counterpart of the naive-ET/true-UTC
 * "now" bug fixed across this session (see recurring.ts's nowNaiveET header).
 *
 * start_time/end_time are naive-ET; `thisWeek`'s "now" cutoff used to be a
 * raw `new Date().toISOString()` (true UTC), which strings-compares as
 * *later* than a naive-ET value that is genuinely still in the future --
 * silently dropping any booking due in the next 4-5h (EDT/EST) from the
 * `thisWeek` count. `revenue`'s payment_date filter is genuinely UTC (written
 * via `new Date().toISOString()` at payment time), so it must keep using a
 * true-UTC month-start boundary -- this also guards that the fix didn't flip
 * that one to the naive-ET boundary by mistake.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant-A' }, error: null }),
}))

beforeEach(() => {
  h.seq = 0
  h.store = { bookings: [] }
})

describe('GET /api/bookings/stats', () => {
  it('counts a booking 5 minutes from now (ET wall-clock) in thisWeek', async () => {
    // A booking whose naive-ET start_time is 5 minutes in the future. Under
    // the old `now.toISOString()` (true-UTC) cutoff this string-compares as
    // already past for any positive ET/UTC gap, so it would be silently
    // dropped from `thisWeek`.
    const startTime = nowNaiveET(5 * 60 * 1000)
    h.store.bookings.push({
      id: 'b1', tenant_id: 'tenant-A', status: 'confirmed', start_time: startTime,
    })

    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    expect(body.thisWeek).toBe(1)
  })

  it('excludes a booking whose ET start_time already passed', async () => {
    const startTime = nowNaiveET(-5 * 60 * 1000)
    h.store.bookings.push({
      id: 'b2', tenant_id: 'tenant-A', status: 'confirmed', start_time: startTime,
    })

    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    expect(body.thisWeek).toBe(0)
  })

  it('excludes a booking more than 7 days out', async () => {
    const startTime = nowNaiveET(8 * 24 * 60 * 60 * 1000)
    h.store.bookings.push({
      id: 'b3', tenant_id: 'tenant-A', status: 'confirmed', start_time: startTime,
    })

    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    expect(body.thisWeek).toBe(0)
  })

  it('still sums revenue by a true-UTC payment_date boundary (unaffected by the naive-ET fix)', async () => {
    const now = new Date()
    const earlierTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 1)).toISOString()
    h.store.bookings.push({
      id: 'b4', tenant_id: 'tenant-A', payment_status: 'paid', payment_date: earlierTodayUTC, price: 150,
    })

    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    expect(body.revenue).toBe(150)
  })
})
