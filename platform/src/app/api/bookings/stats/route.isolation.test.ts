import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

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
  const now = Date.now()
  const future = new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString() // +2d → in this-week window
  const earlierToday = new Date(now - 2 * 60 * 60 * 1000).toISOString() // -2h → same month, before now
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
