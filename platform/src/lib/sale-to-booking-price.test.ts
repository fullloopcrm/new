/**
 * createBookingFromQuote -- bookings.price must be stored in CENTS, same
 * convention as every consumer (POST /api/invoices' from_booking_id handling:
 * "booking.price is in CENTS... Prior code double-multiplied by 100").
 *
 * This writer instead did `quote.total_cents / 100` -- converting to DOLLARS
 * -- before storing it into `bookings.price`. Same bug, same root cause, as
 * the recurring sibling `createRecurringSeriesFromQuote` (sale-to-recurring.ts)
 * fixed alongside this. A $150 one-off service quote converted to a pending
 * booking priced at $1.50 once a real invoice was cut from it. Live impact is
 * real -- createBookingFromQuote is hit from the public quote-accept endpoint,
 * the deals stage-change conversion, and the Stripe payment webhook.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { createBookingFromQuote } from './sale-to-booking'

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
      converted_booking_id: null,
      converted_at: null,
      total_cents: 15_000, // $150.00
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

describe('createBookingFromQuote -- bookings.price stays in cents', () => {
  it('stores the full cents value, not total_cents/100', async () => {
    const { booking_id } = await createBookingFromQuote(TENANT_ID, QUOTE_ID)
    const booking = fake._all('bookings').find((b) => b.id === booking_id)
    expect(booking).toBeTruthy()
    // Old buggy behavior stored 150 (dollars). Correct is 15000 (cents).
    expect(booking!.price).toBe(15_000)
  })
})
