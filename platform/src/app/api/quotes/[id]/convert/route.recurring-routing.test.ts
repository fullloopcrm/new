/**
 * QUOTE-CONVERT ROUTE — recurring_type quotes must become a recurring series,
 * not a one-off Booking.
 *
 * Same fulfillment-routing gap already fixed on the Stripe deposit webhook
 * and the manual deal-stage-change close (webhooks/stripe/route.ts,
 * deals/[id]/stage/route.ts): this route -- the staff "Convert to Booking"
 * button -- always created a single Booking regardless of quote.recurring_type,
 * so a customer who signed up for a weekly service got ONE booking and no
 * ongoing recurring_schedules series ever generated.
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

function seedRecurringQuote(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('quotes', [
    {
      id: QUOTE_ID,
      tenant_id: TENANT_ID,
      status: 'accepted',
      converted_booking_id: null,
      converted_schedule_id: null,
      converted_at: null,
      total_cents: 15_000,
      recurring_type: 'weekly',
      client_id: 'client-1',
      title: 'Weekly Cleaning',
      quote_number: 'Q-2',
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
  seedRecurringQuote()
})

describe('POST /api/quotes/[id]/convert — recurring_type routes to a schedule, not a booking', () => {
  it('creates a recurring_schedules row, not a one-off booking', async () => {
    const res = await POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.schedule_id).toBeTruthy()
    expect(body.booking_id).toBeUndefined()

    const schedules = fake._all('recurring_schedules')
    expect(schedules.length).toBe(1)
    expect(schedules[0].client_id).toBe('client-1')

    // The manual "Convert to Booking" flow must NOT also create a plain
    // one-off booking for a recurring quote -- only the series's own
    // initial-batch bookings (schedule_id set) should exist.
    const bookings = fake._all('bookings')
    expect(bookings.every((b) => b.schedule_id === schedules[0].id)).toBe(true)

    const quoteRow = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(quoteRow?.converted_schedule_id).toBe(schedules[0].id)
    expect(quoteRow?.converted_booking_id).toBeNull()
  })

  it('is idempotent — a second call returns the same schedule without creating another', async () => {
    const first = await (await POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) })).json()
    const second = await (await POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) })).json()
    expect(second.already_converted).toBe(true)
    expect(second.schedule_id).toBe(first.schedule_id)
    expect(fake._all('recurring_schedules').length).toBe(1)
  })
})
