/**
 * accountNetCents (reconcile.ts) pages through journal_lines with
 * `.range()`. Postgres gives no row-order guarantee across separate
 * OFFSET/LIMIT queries without an explicit ORDER BY — a real-world
 * concurrent write, autovacuum, or planner replan between page fetches can
 * change which rows land at which offset. Without `.order('id')`, that
 * reshuffle makes a multi-page scan silently skip some rows and
 * double-count others; the aggregate balance comes out wrong with no error
 * raised anywhere.
 *
 * This test proves the fix by simulating exactly that: it reverses the
 * underlying row order the moment the first page's query resolves (the
 * same "hook the moment" technique used in
 * jobs-milestone-release-race.test.ts), then verifies the second page
 * still partitions cleanly against the first.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/ledger', () => ({
  ensureChartAccounts: vi.fn(async () => {}),
  getAccountIdByCode: vi.fn(async (_tenantId: string, code: string) =>
    code === '1050' ? COA_ID : null,
  ),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { clearingTargets } from './reconcile'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const COA_ID = 'coa-undeposited'
const PAGE_SIZE = 1000
const TOTAL_ROWS = 1200 // forces exactly 2 page fetches (1000 + 200)

// Correct total: sum(1..TOTAL_ROWS) = TOTAL_ROWS*(TOTAL_ROWS+1)/2.
const EXPECTED_TOTAL_CENTS = (TOTAL_ROWS * (TOTAL_ROWS + 1)) / 2

function seedJournalLines() {
  fake._store.clear()
  // Deliberately non-uniform per-row amounts (i+1, not a flat 1) — with a
  // flat per-row value, a pagination bug that double-counts N rows and
  // skips a different N rows can cancel out in the sum by coincidence and
  // hide the defect. Varying amounts mean any skip/duplicate changes the
  // total detectably.
  const rows = Array.from({ length: TOTAL_ROWS }, (_, i) => ({
    id: `jl-${String(i).padStart(4, '0')}`,
    tenant_id: TENANT_ID,
    coa_id: COA_ID,
    debit_cents: i + 1,
    credit_cents: 0,
  }))
  fake._seed('journal_lines', rows)
}

/**
 * Wraps `fake.from` so the FIRST `.select()` read against `table` resolves
 * normally, then reverses the underlying store's row order before any
 * subsequent query runs — simulating Postgres returning a different
 * physical row order on the next paginated fetch.
 */
function reorderStoreAfterFirstPage(table: string) {
  const originalFrom = fake.from.bind(fake)
  let fired = false
  fake.from = ((t: string) => {
    const builder = originalFrom(t)
    if (t !== table) return builder
    const originalSelect = builder.select.bind(builder)
    builder.select = (...args: Parameters<typeof originalSelect>) => {
      const qb = originalSelect(...args)
      const originalThen = qb.then.bind(qb)
      qb.then = ((onFulfilled: Parameters<typeof originalThen>[0], onRejected: Parameters<typeof originalThen>[1]) => {
        return originalThen((value) => {
          if (!fired) {
            fired = true
            fake._store.set(table, [...fake._all(table)].reverse())
          }
          return onFulfilled ? onFulfilled(value) : value
        }, onRejected)
      }) as typeof qb.then
      return qb
    }
    return builder
  }) as typeof fake.from
}

describe('accountNetCents — journal_lines pagination stays correct when row order shifts between pages', () => {
  beforeEach(() => {
    seedJournalLines()
  })

  it('sums every row exactly once across a 2-page scan even when the store reorders mid-scan', async () => {
    reorderStoreAfterFirstPage('journal_lines')
    const result = await clearingTargets(TENANT_ID)
    expect(result.undepositedBalanceCents).toBe(EXPECTED_TOTAL_CENTS)
  })

  it('control: without any reorder, pagination sums correctly too (no regression)', async () => {
    const result = await clearingTargets(TENANT_ID)
    expect(result.undepositedBalanceCents).toBe(EXPECTED_TOTAL_CENTS)
  })

  it('sanity: confirms 2 pages are actually exercised (TOTAL_ROWS > PAGE_SIZE)', () => {
    expect(TOTAL_ROWS).toBeGreaterThan(PAGE_SIZE)
  })
})
