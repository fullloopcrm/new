/**
 * createRecurringSeriesFromQuote -- bookings.price must be stored in CENTS,
 * the same convention every consumer assumes (see POST /api/invoices'
 * `from_booking_id` handling: "booking.price is in CENTS... Prior code
 * double-multiplied by 100", and /api/client/recurring's own `price` writer,
 * which stays in cents-space and only divides by 100 when building a
 * customer-facing dollar response).
 *
 * This writer instead did `pricePerVisit = quote.total_cents / 100` --
 * converting to DOLLARS -- before storing it straight into `bookings.price`.
 * Every consumer that reads booking.price as cents (buildConsolidatedLineItems
 * for monthly rollup invoices, POST /api/invoices' from_booking_id path) then
 * silently under-billed by 100x: a $150/visit recurring cleaning contract
 * invoiced at $1.50/visit. Live impact is real -- createRecurringSeriesFromQuote
 * is the actual sale-to-recurring conversion engine, hit from the public
 * quote-accept endpoint, the deals stage-change conversion, and the Stripe
 * payment webhook.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { vi } from 'vitest'
import { supabaseAdmin } from '@/lib/supabase'
import { createRecurringSeriesFromQuote } from './sale-to-recurring'

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
      converted_schedule_id: null,
      converted_at: null,
      recurring_type: 'weekly',
      recurring_start_date: '2026-08-03',
      recurring_preferred_time: '09:00',
      recurring_duration_hours: 2,
      total_cents: 15_000, // $150.00/visit
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
  seedQuote()
})

describe('createRecurringSeriesFromQuote -- bookings.price stays in cents', () => {
  it('stores the full cents value, not total_cents/100', async () => {
    await createRecurringSeriesFromQuote(TENANT_ID, QUOTE_ID)

    const bookings = fake._all('bookings')
    expect(bookings.length).toBeGreaterThan(0)
    for (const b of bookings) {
      // Old buggy behavior stored 150 (dollars). Correct is 15000 (cents).
      expect(b.price).toBe(15_000)
    }
  })
})
