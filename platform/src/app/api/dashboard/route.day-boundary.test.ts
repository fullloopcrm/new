import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'
import { nowNaiveET } from '@/lib/recurring'

/**
 * GET /api/dashboard — day-boundary counterpart of the naive-ET/true-UTC bug
 * fixed across this session (see recurring.ts's nowNaiveET header).
 *
 * start_time/end_time are naive-ET; today/week/month/year boundaries here
 * used to be built from `new Date(now.getFullYear(), now.getMonth(),
 * now.getDate())` -- the SERVER's local (UTC on Vercel) calendar, not ET --
 * silently shifting every cutoff by the ET/UTC gap (4-5h). clients.created_at
 * is a genuine timestamptz, so its month-start boundary must stay true-UTC.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { name: 'Tenant A' }, role: 'owner' }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = { bookings: [], clients: [], team_members: [] }
})

describe('GET /api/dashboard — day-boundary fix', () => {
  it("counts a booking starting 5 minutes from now (ET wall-clock) in today's jobs and financials", async () => {
    h.store.bookings = [{
      id: 'b1', tenant_id: 'tenant-A', start_time: nowNaiveET(5 * 60 * 1000),
      status: 'completed', payment_status: 'paid', price: 100,
    }]

    const res = await GET()
    const json = await res.json()

    expect(json.todayJobs).toHaveLength(1)
    expect(json.financials.today.revenue).toBe(100)
  })

  it('excludes a booking from 9 days ago from weekPaid financials (outside this ET week)', async () => {
    h.store.bookings = [{
      id: 'b2', tenant_id: 'tenant-A', start_time: nowNaiveET(-9 * 24 * 60 * 60 * 1000),
      status: 'completed', payment_status: 'paid', price: 500,
    }]

    const res = await GET()
    const json = await res.json()

    expect(json.financials.week.revenue).toBe(0)
  })

  it("counts a client created earlier this (true-UTC) month in clients.newThisMonth", async () => {
    const earlierThisUTCMonth = (() => {
      const now = new Date()
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12)).toISOString()
    })()
    h.store.clients = [{ id: 'c1', tenant_id: 'tenant-A', created_at: earlierThisUTCMonth }]

    const res = await GET()
    const json = await res.json()

    expect(json.clients.newThisMonth).toBe(1)
  })
})
