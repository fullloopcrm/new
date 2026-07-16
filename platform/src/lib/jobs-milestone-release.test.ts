/**
 * releasePaymentsForEvent — multi-milestone stage-gated release.
 *
 * Bug (found 2026-07-16 during dumpster/junk/moving archetype depth work):
 * a job's payment plan can have MULTIPLE 'on_stage_complete' payments (e.g.
 * framing / drywall / final, each meant to gate on a different work session
 * — the sales quote-to-job UI explicitly supports adding several milestone
 * rows with that same trigger). Nothing in the schema ties a specific
 * job_payments row to a specific session. The old query released EVERY
 * pending 'on_stage_complete' row the instant ANY single session completed
 * — so finishing the first of three work days invoiced all three milestones
 * at once, months before the later stages were actually done.
 *
 * Fix: 'session_completed' releases only the earliest pending row (by
 * sort_order) per call — one session done → one milestone due, matching the
 * function's own doc comment. The job's own 'completed' event still releases
 * everything left pending, since no further sessions are coming.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { releasePaymentsForEvent } from './jobs'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const JOB_ID = 'job-1'

function seedMilestonePlan() {
  fake._store.clear()
  fake._seed('job_payments', [
    { id: 'pay-deposit', tenant_id: TENANT_ID, job_id: JOB_ID, label: 'Deposit', kind: 'deposit', amount_cents: 5_000, trigger: 'on_signature', status: 'invoiced', sort_order: 0 },
    { id: 'pay-framing', tenant_id: TENANT_ID, job_id: JOB_ID, label: 'Framing done', kind: 'milestone', amount_cents: 5_000, trigger: 'on_stage_complete', status: 'pending', sort_order: 1 },
    { id: 'pay-drywall', tenant_id: TENANT_ID, job_id: JOB_ID, label: 'Drywall done', kind: 'milestone', amount_cents: 5_000, trigger: 'on_stage_complete', status: 'pending', sort_order: 2 },
    { id: 'pay-final', tenant_id: TENANT_ID, job_id: JOB_ID, label: 'Final', kind: 'final', amount_cents: 5_000, trigger: 'on_stage_complete', status: 'pending', sort_order: 3 },
  ])
}

beforeEach(() => {
  seedMilestonePlan()
})

describe('releasePaymentsForEvent — session_completed releases one milestone at a time', () => {
  it('the first session_completed releases only the earliest pending stage-gated payment', async () => {
    const count = await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'session_completed')
    expect(count).toBe(1)

    const rows = fake._all('job_payments').filter((p) => p.job_id === JOB_ID)
    expect(rows.find((p) => p.id === 'pay-framing')?.status).toBe('invoiced')
    expect(rows.find((p) => p.id === 'pay-drywall')?.status).toBe('pending')
    expect(rows.find((p) => p.id === 'pay-final')?.status).toBe('pending')
  })

  it('successive session_completed calls release the plan in sort_order, one per call', async () => {
    await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'session_completed')
    await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'session_completed')

    const rows = fake._all('job_payments').filter((p) => p.job_id === JOB_ID)
    expect(rows.find((p) => p.id === 'pay-framing')?.status).toBe('invoiced')
    expect(rows.find((p) => p.id === 'pay-drywall')?.status).toBe('invoiced')
    expect(rows.find((p) => p.id === 'pay-final')?.status).toBe('pending')
  })

  it('a third session_completed call finally releases the last stage-gated payment', async () => {
    await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'session_completed')
    await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'session_completed')
    const count = await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'session_completed')
    expect(count).toBe(1)

    const rows = fake._all('job_payments').filter((p) => p.job_id === JOB_ID)
    expect(rows.every((p) => p.status === 'invoiced')).toBe(true)
  })

  it('a 4th call is a no-op once nothing is left pending', async () => {
    await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'session_completed')
    await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'session_completed')
    await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'session_completed')
    const count = await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'session_completed')
    expect(count).toBe(0)
  })
})

describe('releasePaymentsForEvent — job completed releases everything left', () => {
  it('the whole-job "completed" event releases ALL remaining pending stage-gated payments at once', async () => {
    const count = await releasePaymentsForEvent(TENANT_ID, JOB_ID, 'completed')
    expect(count).toBe(3)

    const rows = fake._all('job_payments').filter((p) => p.job_id === JOB_ID)
    expect(rows.find((p) => p.id === 'pay-framing')?.status).toBe('invoiced')
    expect(rows.find((p) => p.id === 'pay-drywall')?.status).toBe('invoiced')
    expect(rows.find((p) => p.id === 'pay-final')?.status).toBe('invoiced')
  })
})
