import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * `advanceCursor()`'s monthly/quarterly branches used to chain
 * `setUTCMonth(getUTCMonth() + N)` straight off the previous tick's own
 * (possibly already-overflowed) result — same bug class already fixed in
 * `lib/recurring.ts`'s `generateRecurringDates()`. A day-29/30/31 anchor
 * that overflows a short month (Jan 31 -> Feb 31 rolls to Mar 3) became the
 * new baseline for every remaining tick in the forecast walk, silently
 * shifting which week a recurring expense's outflow lands in.
 *
 * Probe: a monthly recurring expense anchored on Jan 31 must land its Feb
 * occurrence on Feb 28 (this tenant's Monday-of-week bucket) and its Mar
 * occurrence back on Mar 31 — not skip February and land on Mar 3 the way
 * the old chained-setUTCMonth code did.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' }, error: null })),
}))

import { GET } from './route'

function seed() {
  return {
    bookings: [] as Record<string, unknown>[],
    invoices: [] as Record<string, unknown>[],
    recurring_expenses: [
      {
        id: 're-1',
        tenant_id: A,
        amount_cents: 10000,
        frequency: 'monthly',
        next_due_date: '2026-01-31',
        start_date: '2026-01-31',
        active: true,
      },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-02-25T12:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('finance/cash-flow GET — monthly anchor day survives a short-month crossing', () => {
  it('buckets the Feb occurrence on its own week (Feb 28), not a skipped/drifted date', async () => {
    const res = await GET(new Request('http://t/api/finance/cash-flow?weeks=8'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const feb23Week = body.weeks.find((w: { week_start: string }) => w.week_start === '2026-02-23')
    expect(feb23Week?.outflows_cents).toBe(10000)
  })

  it('does not drift the Feb occurrence forward into the Mar-3 week (the old chained-setUTCMonth bug)', async () => {
    const res = await GET(new Request('http://t/api/finance/cash-flow?weeks=8'))
    const body = await res.json()
    const mar02Week = body.weeks.find((w: { week_start: string }) => w.week_start === '2026-03-02')
    expect(mar02Week?.outflows_cents).toBe(0)
  })

  it('re-anchors the Mar occurrence back to day 31, not a compounded drift off Mar 3', async () => {
    const res = await GET(new Request('http://t/api/finance/cash-flow?weeks=8'))
    const body = await res.json()
    const mar30Week = body.weeks.find((w: { week_start: string }) => w.week_start === '2026-03-30')
    expect(mar30Week?.outflows_cents).toBe(10000)
  })
})
