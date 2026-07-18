/**
 * CHANGE ORDERS — a proposal with quotes.linked_job_id set (see
 * migrations/2026_07_18_quotes_linked_job_id.sql) is a change order against
 * an EXISTING job, not a new sale. Accepting it must attach new
 * job_payments rows to that job instead of routing through the normal
 * createJobFromQuote path and creating a second job — and it must never
 * touch jobs.total_cents (the original contracted amount stays its own
 * number; the job detail page sums original + accepted change orders for
 * display only).
 *
 * Mirrors the sibling race suite (jobs-conversion-race.test.ts) for the
 * attach path specifically, since attachChangeOrderToJob reuses the exact
 * same claim contract as createJobFromQuote.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
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
const JOB_ID = 'job-1'
const QUOTE_ID = 'quote-co-1'
const ORIGINAL_JOB_TOTAL_CENTS = 100_000

function seed(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('jobs', [
    {
      id: JOB_ID,
      tenant_id: TENANT_ID,
      client_id: 'client-1',
      quote_id: 'quote-original-sale',
      title: 'Kitchen remodel',
      status: 'in_progress',
      total_cents: ORIGINAL_JOB_TOTAL_CENTS,
      service_address: '123 Main St',
      notes: null,
    },
  ])
  fake._seed('quotes', [
    {
      id: QUOTE_ID,
      tenant_id: TENANT_ID,
      status: 'accepted',
      converted_job_id: null,
      converted_at: null,
      linked_job_id: JOB_ID,
      total_cents: 20_000,
      client_id: 'client-1',
      title: 'Add a deck',
      quote_number: 'Q-202607-0099',
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
  seed()
})

describe('attachChangeOrderToJob (via createJobFromQuote)', () => {
  it('attaches to the linked job instead of creating a new one, and never touches jobs.total_cents', async () => {
    const result = await createJobFromQuote(TENANT_ID, QUOTE_ID)

    expect(result).toEqual({ job_id: JOB_ID, already_converted: false })

    // No second job was created.
    const jobs = fake._all('jobs')
    expect(jobs.length).toBe(1)
    expect(jobs[0].id).toBe(JOB_ID)
    // The original contracted amount is untouched — it stays its own number.
    expect(jobs[0].total_cents).toBe(ORIGINAL_JOB_TOTAL_CENTS)

    // A job_payments row was posted for the change-order amount.
    const payments = fake._all('job_payments')
    expect(payments.length).toBe(1)
    expect(payments[0].job_id).toBe(JOB_ID)
    expect(payments[0].amount_cents).toBe(20_000)
    expect(payments[0].label).toContain('Q-202607-0099')

    // The quote itself is marked converted and points at the existing job.
    const quote = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(quote?.status).toBe('converted')
    expect(quote?.converted_job_id).toBe(JOB_ID)

    // A job_events entry notes where the change order came from.
    const events = fake._all('job_events').filter((e) => e.job_id === JOB_ID)
    const changeOrderEvent = events.find((e) => e.event_type === 'change_order_added')
    expect(changeOrderEvent).toBeDefined()
    expect((changeOrderEvent?.detail as Row).quote_id).toBe(QUOTE_ID)
    expect((changeOrderEvent?.detail as Row).quote_number).toBe('Q-202607-0099')
  })

  it('convertSaleToJob (the shared accept/webhook entry point) routes a linked-job quote to the attach path', async () => {
    const result = await convertSaleToJob(TENANT_ID, { type: 'quote', quoteId: QUOTE_ID })

    expect(result).toEqual({ job_id: JOB_ID, already_converted: false })
    expect(fake._all('jobs').length).toBe(1)
    expect(fake._all('job_payments').length).toBe(1)
  })

  it('is idempotent on a sequential retry — no duplicate job_payments row', async () => {
    const first = await createJobFromQuote(TENANT_ID, QUOTE_ID)
    expect(first.already_converted).toBe(false)

    const second = await createJobFromQuote(TENANT_ID, QUOTE_ID)
    expect(second.already_converted).toBe(true)
    expect(second.job_id).toBe(JOB_ID)

    expect(fake._all('jobs').length).toBe(1)
    expect(fake._all('job_payments').length).toBe(1)
  })

  it('two concurrent conversions post exactly one change-order payment, not two', async () => {
    const results = await Promise.allSettled([
      createJobFromQuote(TENANT_ID, QUOTE_ID),
      createJobFromQuote(TENANT_ID, QUOTE_ID),
    ])

    expect(fake._all('jobs').length).toBe(1)
    expect(fake._all('job_payments').length).toBe(1)

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    expect(fulfilled.length).toBeGreaterThanOrEqual(1)
  })

  it('honors a custom payment plan instead of the default single change-order line', async () => {
    const result = await createJobFromQuote(TENANT_ID, QUOTE_ID, {
      payments: [
        { label: 'Deck materials', kind: 'progress', amount_cents: 12_000 },
        { label: 'Deck labor', kind: 'final', amount_cents: 8_000 },
      ],
    })

    expect(result.already_converted).toBe(false)
    const payments = fake._all('job_payments')
    expect(payments.length).toBe(2)
    expect((payments.map((p) => p.amount_cents) as number[]).sort((a, b) => a - b)).toEqual([8_000, 12_000])
    // Original job total still untouched with a multi-line plan too.
    expect(fake._all('jobs')[0].total_cents).toBe(ORIGINAL_JOB_TOTAL_CENTS)
  })
})
