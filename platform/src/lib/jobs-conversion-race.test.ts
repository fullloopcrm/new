/**
 * JOB-CONVERSION RACE — `createJobFromQuote` atomic claim.
 *
 * `convertSaleToJob` / `createJobFromQuote` used to guard duplicate job
 * creation with a plain select-then-branch on `quotes.converted_job_id`
 * (LEADER finding, 2026-07-13): two concurrent callers (a Stripe webhook
 * retry racing the first delivery, or two legitimate triggers) could both
 * read `converted_job_id: null`, both pass the check, and both create a
 * full duplicate job + payment plan before either write landed.
 *
 * The fix reuses `converted_at` (set early, not just at the end) as an
 * atomic UPDATE ... WHERE ... RETURNING claim marker — same shape as the
 * prospects claim in the Stripe webhook (route.ts:87-97). This suite proves
 * the race is closed: only one of two concurrent calls creates a job, and a
 * sequential retry after the first lands is idempotent.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { createJobFromQuote, convertSaleToJob } from './jobs'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const QUOTE_ID = 'quote-1'

function seedQuote(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('quotes', [
    {
      id: QUOTE_ID,
      tenant_id: TENANT_ID,
      status: 'accepted',
      converted_job_id: null,
      converted_at: null,
      total_cents: 10_000,
      client_id: 'client-1',
      title: 'Test Quote',
      quote_number: 'Q-1',
      contact_email: null,
      contact_name: null,
      contact_phone: null,
      service_address: null,
      notes: null,
      ...overrides,
    },
  ])
}

beforeEach(() => {
  seedQuote()
})

describe('createJobFromQuote — concurrent conversion race', () => {
  it('two concurrent conversions produce exactly one job, not two', async () => {
    const results = await Promise.allSettled([
      createJobFromQuote(TENANT_ID, QUOTE_ID),
      createJobFromQuote(TENANT_ID, QUOTE_ID),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    // Exactly one caller wins the claim and creates the job. The loser either
    // observes the winner's finished job (already_converted: true) or, if it
    // raced the claim before the winner finished, gets a retryable conflict —
    // never a second job.
    const jobs = fake._all('jobs')
    expect(jobs.length).toBe(1)

    if (rejected.length > 0) {
      expect(rejected[0].reason).toBeInstanceOf(Error)
      expect((rejected[0].reason as Error).message).toMatch(/already in progress/)
      expect(fulfilled.length).toBe(1)
    } else {
      // Both resolved: one created (already_converted: false), one saw it
      // already done (already_converted: true) — same job_id either way.
      const values = fulfilled.map((r) => (r as PromiseFulfilledResult<{ job_id: string; already_converted: boolean }>).value)
      const created = values.filter((v) => !v.already_converted)
      const seen = values.filter((v) => v.already_converted)
      expect(created.length).toBe(1)
      expect(seen.length).toBe(1)
      expect(seen[0].job_id).toBe(created[0].job_id)
    }

    // The quote row itself only ever points at the one job that was created.
    const quoteRow = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(quoteRow?.converted_job_id).toBe(jobs[0].id)
  })

  it('a sequential retry after the winner lands is idempotent (no second job)', async () => {
    const first = await createJobFromQuote(TENANT_ID, QUOTE_ID)
    expect(first.already_converted).toBe(false)

    // Simulates a Stripe redelivery arriving after the first call fully
    // committed — the classic idempotent-retry case, distinct from the
    // true-concurrency race above.
    const second = await createJobFromQuote(TENANT_ID, QUOTE_ID)
    expect(second.already_converted).toBe(true)
    expect(second.job_id).toBe(first.job_id)

    expect(fake._all('jobs').length).toBe(1)
  })

  it('releases the claim on a failed job creation so a retry can succeed cleanly', async () => {
    // Force the jobs insert to fail (simulates any downstream failure after
    // the atomic claim UPDATE already succeeded) via a unique constraint
    // collision on quote_id.
    fake._addUniqueConstraint('jobs', 'quote_id')
    fake._seed('jobs', [{ id: 'conflict-1', tenant_id: TENANT_ID, quote_id: QUOTE_ID }])

    await expect(createJobFromQuote(TENANT_ID, QUOTE_ID)).rejects.toThrow()
    expect(fake._all('jobs').length).toBe(1) // only the pre-seeded conflict row
    expect(fake._all('job_payments').length).toBe(0)

    // The claim must be released — otherwise this quote is stuck forever.
    const stuckQuote = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(stuckQuote?.converted_at).toBeNull()
    expect(stuckQuote?.converted_job_id).toBeNull()

    // Clear the conflict and retry — should succeed cleanly now.
    fake._store.set('jobs', fake._all('jobs').filter((j) => j.id !== 'conflict-1'))
    const retried = await createJobFromQuote(TENANT_ID, QUOTE_ID)
    expect(retried.already_converted).toBe(false)
    expect(fake._all('jobs').length).toBe(1)
  })

  it('a failure AFTER the job row is created does not duplicate the job on retry', async () => {
    // Force the job_payments insert (which runs after the job row already
    // exists) to fail, simulating any downstream error — not just the very
    // first insert — landing after the job was already committed.
    fake._addUniqueConstraint('job_payments', 'label')
    fake._seed('job_payments', [{ id: 'other-job-payment', tenant_id: TENANT_ID, job_id: 'unrelated-job', label: 'Final payment' }])

    await expect(createJobFromQuote(TENANT_ID, QUOTE_ID)).rejects.toThrow()

    // The job row itself was created before the failure — it must not be
    // discarded, and the quote must still point at it (not reset to
    // reclaimable), or a retry would create a second job for this quote.
    const jobs = fake._all('jobs')
    expect(jobs.length).toBe(1)
    const linkedQuote = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(linkedQuote?.converted_job_id).toBe(jobs[0].id)

    // A retry now sees the quote already converted and returns the SAME job
    // — no duplicate job/payment plan is created for the same sale.
    const retried = await createJobFromQuote(TENANT_ID, QUOTE_ID)
    expect(retried.already_converted).toBe(true)
    expect(retried.job_id).toBe(jobs[0].id)
    expect(fake._all('jobs').length).toBe(1)
  })

  it('convertSaleToJob (the webhook entry point) closes the same race for a quote source', async () => {
    const results = await Promise.allSettled([
      convertSaleToJob(TENANT_ID, { type: 'quote', quoteId: QUOTE_ID }),
      convertSaleToJob(TENANT_ID, { type: 'quote', quoteId: QUOTE_ID }),
    ])

    expect(fake._all('jobs').length).toBe(1)
    expect(results.filter((r) => r.status === 'fulfilled').length).toBeGreaterThanOrEqual(1)
  })
})
