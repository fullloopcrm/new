/**
 * `closeSoldQuote` — the type-aware sold-quote dispatcher.
 *
 * 2026-07-30 pipeline trace found: the deal-stage "mark sold" endpoint and
 * the Stripe deposit-paid webhook both unconditionally called
 * `convertSaleToJob`, which always creates a project Job — even for a plain
 * one-off or recurring quote that should have become a real, schedulable
 * Booking or recurring series. Real prod case: a $365 quote closed this way
 * sat as an unscheduled Job for 11+ days with zero alert. `closeSoldQuote`
 * mirrors the branch already proven correct in
 * quotes/public/[token]/accept/route.ts (recurring_type → recurring series,
 * fulfillment_type 'booking' → single booking, otherwise → Job). This suite
 * proves that dispatch, independent of which caller triggers it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { closeSoldQuote } from './jobs'

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
      converted_booking_id: null,
      converted_schedule_id: null,
      converted_at: null,
      recurring_type: null,
      fulfillment_type: null,
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

describe('closeSoldQuote — dispatch by quote type', () => {
  it('recurring_type set → creates a recurring series, not a Job', async () => {
    seedQuote({ recurring_type: 'weekly' })

    const result = await closeSoldQuote(TENANT_ID, QUOTE_ID)

    expect(result.kind).toBe('recurring')
    expect(fake._all('jobs').length).toBe(0)
  })

  it("fulfillment_type 'booking' → creates a Booking, not a Job", async () => {
    seedQuote({ fulfillment_type: 'booking' })

    const result = await closeSoldQuote(TENANT_ID, QUOTE_ID)

    expect(result.kind).toBe('booking')
    const bookings = fake._all('bookings')
    expect(bookings.length).toBe(1)
    expect(fake._all('jobs').length).toBe(0)
  })

  it('neither recurring nor booking → falls through to a Job (unchanged prior behavior)', async () => {
    seedQuote()

    const result = await closeSoldQuote(TENANT_ID, QUOTE_ID)

    expect(result.kind).toBe('job')
    const jobs = fake._all('jobs')
    expect(jobs.length).toBe(1)
    expect(jobs[0].status).toBe('unscheduled')
  })
})
