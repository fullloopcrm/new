/**
 * RECURRING-CONVERSION RACE — `createRecurringSeriesFromQuote` atomic claim.
 *
 * `createRecurringSeriesFromQuote` used to guard duplicate series creation
 * with a plain select-then-branch on `quotes.converted_schedule_id` (audit
 * finding, 2026-07-13, same TOCTOU shape as `createJobFromQuote`): two
 * concurrent callers — a double-tap on the public quote-accept page, or a
 * retried accept request — could both read `converted_schedule_id: null`,
 * both pass the check, and both create a full duplicate recurring series
 * (schedule + up to 7 weeks of bookings) before either write landed.
 *
 * The fix reuses `converted_at` (shared with the job/booking conversion
 * paths) as an atomic UPDATE ... WHERE ... RETURNING claim marker — same
 * shape as `createJobFromQuote` in jobs.ts. This suite proves the race is
 * closed: only one of two concurrent calls creates a schedule, and a
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
      recurring_start_date: '2026-08-01',
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
  seedQuote()
})

describe('createRecurringSeriesFromQuote — concurrent conversion race', () => {
  it('two concurrent conversions produce exactly one schedule, not two', async () => {
    const results = await Promise.allSettled([
      createRecurringSeriesFromQuote(TENANT_ID, QUOTE_ID),
      createRecurringSeriesFromQuote(TENANT_ID, QUOTE_ID),
    ])

    const schedules = fake._all('recurring_schedules')
    expect(schedules.length).toBe(1)

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    if (rejected.length > 0) {
      expect(rejected[0].reason).toBeInstanceOf(Error)
      expect((rejected[0].reason as Error).message).toMatch(/already in progress/)
      expect(fulfilled.length).toBe(1)
    } else {
      const values = fulfilled.map(
        (r) => (r as PromiseFulfilledResult<{ schedule_id: string; bookings_created: number; already_converted: boolean }>).value,
      )
      const created = values.filter((v) => !v.already_converted)
      const seen = values.filter((v) => v.already_converted)
      expect(created.length).toBe(1)
      expect(seen.length).toBe(1)
      expect(seen[0].schedule_id).toBe(created[0].schedule_id)
    }

    // Only the winner's batch of bookings exists — never two series' worth.
    const bookings = fake._all('bookings')
    expect(bookings.length).toBeGreaterThan(0)
    expect(bookings.every((b) => b.schedule_id === schedules[0].id)).toBe(true)

    const quoteRow = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(quoteRow?.converted_schedule_id).toBe(schedules[0].id)
  })

  it('a sequential retry after the winner lands is idempotent (no second schedule)', async () => {
    const first = await createRecurringSeriesFromQuote(TENANT_ID, QUOTE_ID)
    expect(first.already_converted).toBe(false)
    const bookingsAfterFirst = fake._all('bookings').length

    const second = await createRecurringSeriesFromQuote(TENANT_ID, QUOTE_ID)
    expect(second.already_converted).toBe(true)
    expect(second.schedule_id).toBe(first.schedule_id)
    expect(second.bookings_created).toBe(0)

    expect(fake._all('recurring_schedules').length).toBe(1)
    expect(fake._all('bookings').length).toBe(bookingsAfterFirst)
  })

  it('releases the claim on a failed schedule creation so a retry can succeed cleanly', async () => {
    // Force the recurring_schedules insert to fail (simulates any downstream
    // failure after the atomic claim UPDATE already succeeded) via a unique
    // constraint collision on the deterministic preferred_time.
    fake._addUniqueConstraint('recurring_schedules', 'preferred_time')
    fake._seed('recurring_schedules', [
      { id: 'conflict-1', tenant_id: TENANT_ID, preferred_time: '09:00' },
    ])

    await expect(createRecurringSeriesFromQuote(TENANT_ID, QUOTE_ID)).rejects.toThrow()
    expect(fake._all('recurring_schedules').length).toBe(1) // only the pre-seeded conflict row
    expect(fake._all('bookings').length).toBe(0) // no orphaned bookings from the failed attempt

    // The claim must be released — otherwise this quote is stuck forever.
    const stuckQuote = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(stuckQuote?.converted_at).toBeNull()
    expect(stuckQuote?.converted_schedule_id).toBeNull()

    // Clear the conflict and retry — should succeed cleanly now.
    fake._store.set('recurring_schedules', fake._all('recurring_schedules').filter((s) => s.id !== 'conflict-1'))
    const retried = await createRecurringSeriesFromQuote(TENANT_ID, QUOTE_ID)
    expect(retried.already_converted).toBe(false)
    expect(fake._all('recurring_schedules').length).toBe(1)
    expect(fake._all('bookings').length).toBeGreaterThan(0)
  })
})
