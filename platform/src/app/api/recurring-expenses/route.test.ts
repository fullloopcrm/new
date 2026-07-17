import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/POST /api/recurring-expenses — first route-level regression test
 * (P1/W1 recurring archetype fresh-ground sweep). Zero prior coverage.
 * POST had no enum guard on `frequency` before this pass -- an invalid
 * value would insert cleanly here, then cron/recurring-expenses' advance()
 * silently falls through to its `default: +30 days` branch (wrong cadence,
 * not a crash), same missing-enum-validation class already fixed on
 * PUT /api/schedules/[id] (recurring_type, commit 18f600fe).
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))

import { GET, POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.store = {
    recurring_expenses: [
      { id: 'exp-A1', tenant_id: 'tenant-A', label: 'Rent', active: true, next_due_date: '2026-08-01' },
      { id: 'exp-A2-inactive', tenant_id: 'tenant-A', label: 'Old sub', active: false, next_due_date: '2026-08-01' },
      { id: 'exp-B1', tenant_id: 'tenant-B', label: 'Rent B', active: true, next_due_date: '2026-08-01' },
    ],
  }
})

describe('GET /api/recurring-expenses', () => {
  it("only returns the caller tenant's own active recurring expenses", async () => {
    const res = await GET()
    const json = await res.json()

    const ids = json.recurring_expenses.map((e: { id: string }) => e.id)
    expect(ids).toEqual(['exp-A1'])
  })
})

describe('POST /api/recurring-expenses — validation', () => {
  it('rejects a missing frequency with 400', async () => {
    const res = await POST(postReq({ label: 'Insurance', amount_cents: 5000 }))
    expect(res.status).toBe(400)
  })

  it('rejects an invalid frequency instead of silently inserting a wrong-cadence row', async () => {
    const res = await POST(postReq({ label: 'Insurance', amount_cents: 5000, frequency: 'annual' }))
    expect(res.status).toBe(400)
    expect(h.store.recurring_expenses.find((e) => e.label === 'Insurance')).toBeUndefined()
  })

  it('accepts each frequency the cron advance() switch actually understands', async () => {
    for (const freq of ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']) {
      const res = await POST(postReq({ label: `sub-${freq}`, amount_cents: 100, frequency: freq }))
      expect(res.status).toBe(200)
    }
  })

  it('stamps tenant_id on create', async () => {
    const res = await POST(postReq({ label: 'Insurance', amount_cents: 5000, frequency: 'monthly' }))
    const json = await res.json()
    expect(json.recurring_expense.tenant_id).toBe('tenant-A')
  })

  it('honors an explicit start_date/next_due_date', async () => {
    const res = await POST(postReq({
      label: 'Insurance', amount_cents: 5000, frequency: 'monthly',
      start_date: '2026-07-05', next_due_date: '2026-08-05',
    }))
    const json = await res.json()
    expect(json.recurring_expense.start_date).toBe('2026-07-05')
    expect(json.recurring_expense.next_due_date).toBe('2026-08-05')
  })

  describe('start_date/next_due_date default -- ET calendar day, not true-UTC day', () => {
    // 9pm EDT July 17 == 1am UTC July 18 -- cron/recurring-expenses' advance()
    // (commit 91919561) trusts start_date as the ONLY true anchor and re-derives
    // every future due date's day-of-month from it. If this default persists the
    // wrong (UTC-rolled-over) day, that wrong anchor becomes PERMANENT for the
    // life of the recurring expense -- the exact drift class 91919561 fixed,
    // reintroduced one call site upstream.
    const NOW = new Date('2026-07-18T01:00:00.000Z')
    const realTZ = process.env.TZ

    beforeEach(() => {
      process.env.TZ = 'UTC'
      vi.useFakeTimers()
      vi.setSystemTime(NOW)
    })

    afterEach(() => {
      if (realTZ === undefined) delete process.env.TZ
      else process.env.TZ = realTZ
      vi.useRealTimers()
    })

    it('defaults an omitted start_date to the real ET-today, not the already-rolled-over UTC day', async () => {
      const res = await POST(postReq({ label: 'Insurance', amount_cents: 5000, frequency: 'monthly' }))
      const json = await res.json()
      expect(json.recurring_expense.start_date).toBe('2026-07-17')
      expect(json.recurring_expense.next_due_date).toBe('2026-07-17')
    })
  })
})
