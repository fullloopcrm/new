/**
 * createRecurringSeriesFromQuote -- when a converted quote has no explicit
 * recurring_start_date, the schedule's first visit defaulted via
 * `new Date().toISOString().split('T')[0]`, a true-UTC calendar day. Since
 * UTC's calendar day rolls over ~4-5h (the ET/UTC gap) before ET's real
 * midnight, converting a quote in the evening ET silently anchored the new
 * schedule's first visit on tomorrow's ET date instead of today's.
 *
 * Forces `process.env.TZ = 'UTC'` (same technique as this session's other
 * day-boundary tests) to simulate Vercel's actual runtime.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { createRecurringSeriesFromQuote } from './sale-to-recurring'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const QUOTE_ID = 'quote-1'

// 9:00 PM EDT July 17 -- already 1:00 AM UTC July 18 (UTC's calendar day has
// rolled over to the 18th, but the real ET calendar day is still the 17th).
const NOW = new Date('2026-07-18T01:00:00.000Z')
const realTZ = process.env.TZ

function seedQuote(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('quotes', [
    {
      id: QUOTE_ID,
      tenant_id: TENANT_ID,
      status: 'accepted',
      converted_schedule_id: null,
      converted_at: null,
      recurring_type: 'weekly',
      recurring_start_date: null,
      recurring_preferred_time: '09:00',
      recurring_duration_hours: 2,
      total_cents: 10_000,
      client_id: 'client-1',
      title: 'Test Recurring Quote',
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
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  seedQuote()
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('createRecurringSeriesFromQuote -- start-date default is ET-today, not the already-rolled-over UTC day', () => {
  it('anchors the first visit on the real ET-today date', async () => {
    await createRecurringSeriesFromQuote(TENANT_ID, QUOTE_ID)

    const bookings = fake._all('bookings').sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
    expect(bookings.length).toBeGreaterThan(0)
    expect(String(bookings[0].start_time)).toMatch(/^2026-07-17/)
  })
})
