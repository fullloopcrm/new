import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/clients/enriched — the client health/LTV/MRR dashboard scored
 * recurring clients by comparing recurring_schedules.recurring_type against
 * 'weekly' | 'biweekly' | 'monthly' directly. lib/recurring.ts's RecurringType
 * has no bare 'monthly' -- every enum-validated write path persists
 * 'monthly_date' or 'monthly_weekday' -- and 'triweekly' (a real,
 * staff-selectable cadence, see lib/nycmaid/recurring-discount.ts) had no
 * case at all. Every monthly/triweekly recurring client silently fell
 * through to the one-off booking-count scoring tier: understated frequency
 * score, understated 12mo projected LTV, and zero contribution to the admin
 * "Monthly Recurring Revenue" total. Also: `recurring.discount_pct` was
 * hardcoded to 0 -- admins could never see which clients actually had a
 * loyalty discount applied at checkout.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown> & { order: () => unknown }
      chain.order = () => chain
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ active_client_threshold_days: 45, at_risk_threshold_days: 90 }),
}))

import { GET } from './route'

// Every recurring client has 3 completed, paid $200 bookings ($600 LTV, $200 avg/job) --
// only recurring_type + status varies, isolating the frequency-scoring bug.
function recurringClient(id: string, recurringType: string) {
  return {
    client: { id, tenant_id: h.tenantId, name: `Client ${id}`, email: null, phone: null, address: null, status: 'active', source: null, created_at: '2026-01-01' },
    bookings: [1, 2, 3].map((n) => ({
      id: `${id}-bk-${n}`, tenant_id: h.tenantId, client_id: id, team_member_id: null,
      price: 20000, start_time: `2026-06-0${n}T10:00:00`, status: 'completed', payment_status: 'paid',
    })),
    schedule: { client_id: id, tenant_id: h.tenantId, recurring_type: recurringType, day_of_week: 1, preferred_time: '09:00', status: 'active' },
  }
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  const weekly = recurringClient('c-weekly', 'weekly')
  const monthlyDate = recurringClient('c-monthly-date', 'monthly_date')
  const monthlyWeekday = recurringClient('c-monthly-weekday', 'monthly_weekday')
  const triweekly = recurringClient('c-triweekly', 'triweekly')
  const all = [weekly, monthlyDate, monthlyWeekday, triweekly]

  h.store = {
    clients: all.map((c) => c.client),
    bookings: all.flatMap((c) => c.bookings),
    recurring_schedules: all.map((c) => c.schedule),
    team_members: [],
  }
})

function clientById(json: { clients: Array<Record<string, unknown>> }, id: string): Record<string, unknown> {
  return json.clients.find((c) => c.id === id)!
}

describe('GET /api/clients/enriched — recurring frequency scoring', () => {
  it('scores monthly_date/monthly_weekday the same as the (never-actually-stored) bare "monthly" tier', async () => {
    const res = await GET(new NextRequest('http://x'))
    const json = await res.json()

    const weekly = clientById(json, 'c-weekly') as { health_factors: { frequency: number } }
    const monthlyDate = clientById(json, 'c-monthly-date') as { health_factors: { frequency: number } }
    const monthlyWeekday = clientById(json, 'c-monthly-weekday') as { health_factors: { frequency: number } }

    expect(weekly.health_factors.frequency).toBe(90)
    expect(monthlyDate.health_factors.frequency).toBe(55)
    expect(monthlyWeekday.health_factors.frequency).toBe(55)
  })

  it('gives triweekly a frequency score instead of falling through to the booking-count fallback', async () => {
    const res = await GET(new NextRequest('http://x'))
    const json = await res.json()

    const triweekly = clientById(json, 'c-triweekly') as { health_factors: { frequency: number } }
    expect(triweekly.health_factors.frequency).toBe(55)
  })

  it('projects 12mo LTV off the real cadence for monthly_date/monthly_weekday/triweekly, not the generic count-based fallback', async () => {
    const res = await GET(new NextRequest('http://x'))
    const json = await res.json()

    // avg/job = $200 (20000 cents); monthly => *12, triweekly => *17.
    const monthlyDate = clientById(json, 'c-monthly-date') as { ltv_projected_cents: number }
    const triweekly = clientById(json, 'c-triweekly') as { ltv_projected_cents: number }

    expect(monthlyDate.ltv_projected_cents).toBe(20000 * 12)
    expect(triweekly.ltv_projected_cents).toBe(20000 * 17)
    // Before the fix this hit the `avg * Math.max(2, agg.count)` fallback = 20000 * 3 = 60000.
    expect(monthlyDate.ltv_projected_cents).not.toBe(20000 * 3)
  })

  it('counts monthly_date/monthly_weekday/triweekly clients into mrr_cents instead of contributing zero', async () => {
    const res = await GET(new NextRequest('http://x'))
    const json = await res.json()

    // weekly: 20000*4, monthly_date + monthly_weekday: 20000*1 each, triweekly: 20000*(30/21).
    const expected = 20000 * 4 + 20000 + 20000 + 20000 * (30 / 21)
    expect(json.totals.mrr_cents).toBeCloseTo(expected, 5)
  })

  it('surfaces the real recurring discount instead of a hardcoded 0', async () => {
    const res = await GET(new NextRequest('http://x'))
    const json = await res.json()

    const weekly = clientById(json, 'c-weekly') as { recurring: { discount_pct: number } }
    const monthlyDate = clientById(json, 'c-monthly-date') as { recurring: { discount_pct: number } }

    expect(weekly.recurring.discount_pct).toBe(20)
    expect(monthlyDate.recurring.discount_pct).toBe(10)
  })
})
