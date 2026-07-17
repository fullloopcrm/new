/**
 * `createJobFromQuote` — email-case client dedup.
 *
 * clients.email is always stored lowercase/trimmed (validate.ts on the
 * clients POST route), but quotes.contact_email is raw, unnormalized user
 * input. The client-resolution lookup here used to compare the two as-is —
 * a quote with contact_email "John@Example.com" would miss an existing
 * client stored as "john@example.com" and create a duplicate, splitting
 * that person's booking/quote/payment history across two client records.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { createJobFromQuote } from './jobs'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const QUOTE_ID = 'quote-1'
const EXISTING_CLIENT_ID = 'client-existing'

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
      client_id: null,
      title: 'Test Quote',
      quote_number: 'Q-1',
      contact_email: 'John.Doe@Example.com',
      contact_name: 'John Doe',
      contact_phone: null,
      service_address: null,
      notes: null,
      ...overrides,
    },
  ])
  fake._seed('clients', [
    { id: EXISTING_CLIENT_ID, tenant_id: TENANT_ID, name: 'John Doe', email: 'john.doe@example.com', phone: null },
  ])
}

beforeEach(() => {
  seedQuote()
})

describe('createJobFromQuote — email-case client dedup', () => {
  it('matches an existing client whose stored email differs only in case from contact_email', async () => {
    const result = await createJobFromQuote(TENANT_ID, QUOTE_ID)
    expect(result.already_converted).toBe(false)

    expect(fake._all('clients').length).toBe(1)
    const job = fake._all('jobs').find((j) => j.id === result.job_id)
    expect(job?.client_id).toBe(EXISTING_CLIENT_ID)
  })
})
