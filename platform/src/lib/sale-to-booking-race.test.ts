/**
 * BOOKING-CONVERSION RACE — `createBookingFromQuote` atomic claim.
 *
 * `createBookingFromQuote` used to guard duplicate booking creation with a
 * plain select-then-branch on `quotes.converted_booking_id` (audit finding,
 * 2026-07-13, same TOCTOU shape as `createJobFromQuote`): two concurrent
 * callers — a double-tap on the public quote-accept page, or a retried
 * accept request — could both read `converted_booking_id: null`, both pass
 * the check, and both create a full duplicate booking before either write
 * landed.
 *
 * The fix reuses `converted_at` (shared with the job/recurring conversion
 * paths) as an atomic UPDATE ... WHERE ... RETURNING claim marker — same
 * shape as `createJobFromQuote` in jobs.ts. This suite proves the race is
 * closed: only one of two concurrent calls creates a booking, and a
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

describe('createBookingFromQuote — concurrent conversion race', () => {
  it('two concurrent conversions produce exactly one booking, not two', async () => {
    const results = await Promise.allSettled([
      createBookingFromQuote(TENANT_ID, QUOTE_ID),
      createBookingFromQuote(TENANT_ID, QUOTE_ID),
    ])

    const bookings = fake._all('bookings')
    expect(bookings.length).toBe(1)

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    if (rejected.length > 0) {
      expect(rejected[0].reason).toBeInstanceOf(Error)
      expect((rejected[0].reason as Error).message).toMatch(/already in progress/)
      expect(fulfilled.length).toBe(1)
    } else {
      const values = fulfilled.map((r) => (r as PromiseFulfilledResult<{ booking_id: string; already_converted: boolean }>).value)
      const created = values.filter((v) => !v.already_converted)
      const seen = values.filter((v) => v.already_converted)
      expect(created.length).toBe(1)
      expect(seen.length).toBe(1)
      expect(seen[0].booking_id).toBe(created[0].booking_id)
    }

    const quoteRow = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(quoteRow?.converted_booking_id).toBe(bookings[0].id)
  })

  it('a sequential retry after the winner lands is idempotent (no second booking)', async () => {
    const first = await createBookingFromQuote(TENANT_ID, QUOTE_ID)
    expect(first.already_converted).toBe(false)

    const second = await createBookingFromQuote(TENANT_ID, QUOTE_ID)
    expect(second.already_converted).toBe(true)
    expect(second.booking_id).toBe(first.booking_id)

    expect(fake._all('bookings').length).toBe(1)
  })

  it('releases the claim on a failed booking creation so a retry can succeed cleanly', async () => {
    // Force the bookings insert to fail (simulates any downstream failure
    // after the atomic claim UPDATE already succeeded) via a unique
    // constraint collision on the deterministic notes text.
    fake._addUniqueConstraint('bookings', 'notes')
    fake._seed('bookings', [
      { id: 'conflict-1', tenant_id: TENANT_ID, notes: 'Converted from quote Q-1 — confirm the date' },
    ])

    await expect(createBookingFromQuote(TENANT_ID, QUOTE_ID)).rejects.toThrow()
    expect(fake._all('bookings').length).toBe(1) // only the pre-seeded conflict row

    // The claim must be released — otherwise this quote is stuck forever.
    const stuckQuote = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(stuckQuote?.converted_at).toBeNull()
    expect(stuckQuote?.converted_booking_id).toBeNull()

    // Clear the conflict and retry — should succeed cleanly now.
    fake._store.set('bookings', fake._all('bookings').filter((b) => b.id !== 'conflict-1'))
    const retried = await createBookingFromQuote(TENANT_ID, QUOTE_ID)
    expect(retried.already_converted).toBe(false)
    expect(fake._all('bookings').length).toBe(1)
  })
})
