import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * /api/quote-budgets/recurring/[scheduleId] — the recurring-schedule half of
 * 2026_07_27_recurring_schedule_budgets.sql. A recurring schedule with no
 * originating quote previously had zero path to a budget; this route (and
 * its quote_budgets.recurring_schedule_id column) closes that gap.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, PUT } from './route'

const TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'
const SCHEDULE = 'sched-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(scheduleId: string): { params: Promise<{ scheduleId: string }> } {
  return { params: Promise.resolve({ scheduleId }) }
}
function putReq(body: Record<string, unknown>): Request {
  return new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT
  fake._seed('recurring_schedules', [
    { id: SCHEDULE, tenant_id: TENANT, recurring_type: 'weekly', status: 'active', hourly_rate: 40, duration_hours: 3, client_id: 'c-1', clients: { id: 'c-1', name: 'A Client' } },
  ])
})

describe('recurring-schedule budget — GET', () => {
  it('returns the schedule with budget:null when no budget exists yet', async () => {
    const res = await GET(new Request('http://x'), paramsFor(SCHEDULE))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.schedule.id).toBe(SCHEDULE)
    expect(body.budget).toBeNull()
  })

  it('404s for a schedule belonging to another tenant', async () => {
    currentTenantId = OTHER_TENANT
    const res = await GET(new Request('http://x'), paramsFor(SCHEDULE))
    expect(res.status).toBe(404)
  })
})

describe('recurring-schedule budget — PUT', () => {
  it('creates a budget attached to recurring_schedule_id (not quote_id) with its line items', async () => {
    const res = await PUT(
      putReq({
        target_margin_bps: 3500,
        notes: 'test budget',
        line_items: [{ label: 'Labor', kind: 'labor', budgeted_cents: 10000 }],
      }),
      paramsFor(SCHEDULE),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.budget.recurring_schedule_id).toBe(SCHEDULE)
    expect(body.budget.quote_id ?? null).toBeNull()
    expect(body.budget.line_items).toHaveLength(1)
    expect(body.budget.line_items[0]).toMatchObject({ label: 'Labor', budgeted_cents: 10000 })

    // Exactly one quote_budgets row for this schedule (upsert, not insert-again).
    const rows = fake._all('quote_budgets').filter((r) => r.recurring_schedule_id === SCHEDULE)
    expect(rows).toHaveLength(1)
  })

  it('a second PUT replaces line items rather than accumulating them', async () => {
    await PUT(putReq({ line_items: [{ label: 'A', budgeted_cents: 100 }] }), paramsFor(SCHEDULE))
    const res2 = await PUT(putReq({ line_items: [{ label: 'B', budgeted_cents: 200 }] }), paramsFor(SCHEDULE))
    const body2 = await res2.json()
    expect(body2.budget.line_items).toHaveLength(1)
    expect(body2.budget.line_items[0].label).toBe('B')
  })

  it('404s for a schedule belonging to another tenant, never creating a cross-tenant budget row', async () => {
    currentTenantId = OTHER_TENANT
    const res = await PUT(putReq({ line_items: [] }), paramsFor(SCHEDULE))
    expect(res.status).toBe(404)
    expect(fake._all('quote_budgets')).toHaveLength(0)
  })
})
