import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'
import { nowNaiveET } from '@/lib/recurring'

/**
 * Tenant isolation — GET /api/bookings/stats (converted to tenantDb).
 *
 * The four dashboard counts (upcoming / thisWeek / completed / revenue) all read
 * `bookings` through tenantDb, so a foreign tenant's bookings never bump another
 * tenant's counts or revenue. Times are set relative to `now` so each seeded row
 * lands unambiguously inside (or outside) its window regardless of run date.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

import { GET } from './route'

function seed() {
  // bookings.start_time is a naive America/New_York wall-clock column (no real
  // UTC offset) — the route's thisWeek/completed windows are computed the same
  // way via nowNaiveET(). Seeding with genuine .toISOString() (true UTC) instead
  // would desync by ET's ~4-5h offset against those bounds, silently pulling
  // out-of-window rows into thisWeek's count (the same class of bug already
  // called out in stats/route.ts's own comment re: cron/no-show-check).
  const future = `${nowNaiveET(2 * 24 * 60 * 60 * 1000)}Z` // +2d → in this-week window
  const earlierToday = `${nowNaiveET(-2 * 60 * 60 * 1000)}Z` // -2h → same month, before now
  return {
    bookings: [
      // A: upcoming + thisWeek (scheduled, in-window start)
      { id: 'a-up', tenant_id: A, status: 'scheduled', start_time: future, payment_status: 'unpaid' },
      // A: completed this month (paid revenue 100)
      { id: 'a-c1', tenant_id: A, status: 'completed', start_time: earlierToday, payment_status: 'paid', payment_date: earlierToday, price: 100 },
      // A: completed this month (paid revenue 250)
      { id: 'a-c2', tenant_id: A, status: 'paid', start_time: earlierToday, payment_status: 'paid', payment_date: earlierToday, price: 250 },
      // B: would bump upcoming + thisWeek if it leaked
      { id: 'b-up', tenant_id: B, status: 'scheduled', start_time: future, payment_status: 'unpaid' },
      // B: would bump completed + revenue (999) if it leaked
      { id: 'b-c', tenant_id: B, status: 'completed', start_time: earlierToday, payment_status: 'paid', payment_date: earlierToday, price: 999 },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('bookings/stats — tenant isolation', () => {
  it("counts and revenue reflect only the acting tenant's bookings", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.upcoming).toBe(1) // a-up only (b-up excluded)
    expect(body.thisWeek).toBe(1) // a-up only
    expect(body.completed).toBe(2) // a-c1 + a-c2 (b-c excluded)
    expect(body.revenue).toBe(350) // 100 + 250; B's 999 must not leak
  })
})
