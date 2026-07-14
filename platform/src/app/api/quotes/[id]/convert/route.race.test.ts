/**
 * QUOTE-CONVERT ROUTE RACE — POST /api/quotes/[id]/convert atomic claim.
 *
 * This route used to guard duplicate booking creation with a plain
 * select-then-branch on `quotes.converted_booking_id` (audit finding,
 * 2026-07-13, same TOCTOU shape as lib/sale-to-booking.ts before its fix):
 * an operator double-clicking "Convert" could fire two concurrent requests
 * that both read `converted_booking_id: null`, both pass the check, and
 * both create a full duplicate booking before either write landed.
 *
 * The fix adds the same atomic UPDATE ... WHERE ... RETURNING claim (shared
 * `converted_at` marker) used by the lib conversion paths. This suite proves
 * the race is closed: only one of two concurrent requests creates a booking.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_ID, role: 'owner' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

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

function convertRequest() {
  return new Request(`http://x/api/quotes/${QUOTE_ID}/convert`, { method: 'POST', body: JSON.stringify({}) })
}

beforeEach(() => {
  seedQuote()
})

describe('POST /api/quotes/[id]/convert — concurrent conversion race', () => {
  it('two concurrent requests produce exactly one booking, not two', async () => {
    const results = await Promise.allSettled([
      POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) }),
      POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) }),
    ])

    const bookings = fake._all('bookings')
    expect(bookings.length).toBe(1)

    const bodies: Array<Record<string, unknown>> = await Promise.all(
      results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<Response>).value.json()),
    )
    const created = bodies.filter((b) => !b.already_converted && !b.error)
    const seenOrConflicted = bodies.filter((b) => b.already_converted || b.error)
    expect(created.length).toBe(1)
    expect(created.length + seenOrConflicted.length).toBe(bodies.length)

    const quoteRow = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(quoteRow?.converted_booking_id).toBe(bookings[0].id)
  })

  it('a sequential retry after the winner lands is idempotent (no second booking)', async () => {
    const first = await (await POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) })).json()
    expect(first.already_converted).toBeFalsy()

    const second = await (await POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) })).json()
    expect(second.already_converted).toBe(true)
    expect(second.booking_id).toBe(first.booking_id)

    expect(fake._all('bookings').length).toBe(1)
  })

  it('releases the claim on a failed booking creation so a retry can succeed cleanly', async () => {
    // Force the bookings insert to fail (simulates any downstream failure
    // after the atomic claim UPDATE already succeeded) via a unique
    // constraint collision on the deterministic notes text.
    fake._addUniqueConstraint('bookings', 'notes')
    fake._seed('bookings', [{ id: 'conflict-1', tenant_id: TENANT_ID, notes: 'Converted from quote Q-1' }])

    const res = await POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) })
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toBeTruthy()
    expect(fake._all('bookings').length).toBe(1) // only the pre-seeded conflict row

    // The claim must be released — otherwise this quote is stuck forever.
    const stuckQuote = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(stuckQuote?.converted_at).toBeNull()
    expect(stuckQuote?.converted_booking_id).toBeNull()

    // Clear the conflict and retry — should succeed cleanly now.
    fake._store.set('bookings', fake._all('bookings').filter((b) => b.id !== 'conflict-1'))
    const retried = await (await POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) })).json()
    expect(retried.already_converted).toBeFalsy()
    expect(fake._all('bookings').length).toBe(1)
  })
})
