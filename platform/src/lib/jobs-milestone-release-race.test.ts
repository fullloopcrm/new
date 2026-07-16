/**
 * releasePaymentsForEvent — concurrent session completions must not starve
 * each other's milestone release.
 *
 * The old query SELECTed the "next pending" stage-gated payment, then wrote
 * `.update({status:'invoiced'}).in('id', ids)` in a SEPARATE call. Two
 * sessions on the same multi-milestone job (e.g. a dumpster swap's
 * "delivery" and "pickup" touches, each meant to gate a different milestone)
 * completing at nearly the same instant both SELECT the SAME "next pending"
 * row (framing) before either write lands — one wins the write, but the
 * OTHER session's completion silently released nothing at all: a lost
 * update, not just a harmless duplicate. Fixed by claiming each candidate
 * with its own atomic conditional UPDATE (`eq('status','pending')` in the
 * WHERE clause) and falling through to the next candidate on a lost claim,
 * so a racer that loses on row #1 still claims a distinct row #2 instead of
 * walking away empty-handed.
 *
 * This test simulates the race by hooking the moment the candidate SELECT
 * resolves inside racer A's call and, right there, running racer B's call
 * to completion first (mirrors the hook technique used in
 * invoices/[id]/record-payment/route.overpay-race.test.ts) — proving racer
 * A's stale candidate snapshot (which still shows the framing row as
 * pending) falls through to the drywall row instead of claiming nothing.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { releasePaymentsForEvent } from './jobs'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const JOB_ID = 'job-1'

function seedMilestonePlan() {
  fake._store.clear()
  fake._seed('job_payments', [
    { id: 'pay-framing', tenant_id: TENANT_ID, job_id: JOB_ID, label: 'Framing done', kind: 'milestone', amount_cents: 5_000, trigger: 'on_stage_complete', status: 'pending', sort_order: 1 },
    { id: 'pay-drywall', tenant_id: TENANT_ID, job_id: JOB_ID, label: 'Drywall done', kind: 'milestone', amount_cents: 5_000, trigger: 'on_stage_complete', status: 'pending', sort_order: 2 },
  ])
}

beforeEach(() => {
  seedMilestonePlan()
})

/**
 * Wraps `fake.from` so the FIRST plain `.select()` read against `table`
 * (the candidate query — the per-row claim uses `.update().select()`, a
 * distinct code path) runs `onFirstSelectResolve` to completion before the
 * calling code's own `await` resumes, simulating a second racer's call
 * landing in the window between this call's SELECT and its own claim writes.
 */
function injectRaceOnFirstSelect(table: string, onFirstSelectResolve: () => Promise<void>) {
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
        return originalThen(async (value) => {
          if (!fired) {
            fired = true
            await onFirstSelectResolve()
          }
          return onFulfilled ? onFulfilled(value) : value
        }, onRejected)
      }) as typeof qb.then
      return qb
    }
    return builder
  }) as typeof fake.from
}

describe('releasePaymentsForEvent — concurrent session_completed race', () => {
  it('a racer whose stale candidate snapshot loses the first row still claims a distinct second row', async () => {
    injectRaceOnFirstSelect('job_payments', async () => {
      // Racer B lands fully inside racer A's SELECT-to-claim window and
      // claims the framing milestone for real.
      const count = await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'session_completed')
      expect(count).toBe(1)
      expect(fake._all('job_payments').find((p) => p.id === 'pay-framing')?.status).toBe('invoiced')
    })

    // Racer A's candidate SELECT captured framing as pending (stale), but by
    // the time its own claim UPDATE runs, racer B already invoiced it.
    const countA = await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'session_completed')

    expect(countA).toBe(1)
    const rows = fake._all('job_payments')
    expect(rows.find((p) => p.id === 'pay-framing')?.status).toBe('invoiced')
    // The critical assertion: racer A's completion did NOT get lost — it
    // fell through to drywall instead of releasing nothing.
    expect(rows.find((p) => p.id === 'pay-drywall')?.status).toBe('invoiced')
  })

  it('without a race, sequential calls still release one milestone each (no regression)', async () => {
    const first = await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'session_completed')
    const second = await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'session_completed')
    expect(first).toBe(1)
    expect(second).toBe(1)
    const rows = fake._all('job_payments')
    expect(rows.every((p) => p.status === 'invoiced')).toBe(true)
  })
})
