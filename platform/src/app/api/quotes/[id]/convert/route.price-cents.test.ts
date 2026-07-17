/**
 * QUOTE-CONVERT ROUTE — bookings.price must be stored in CENTS.
 *
 * bookings.price is CENTS everywhere it's read back (POST /api/invoices'
 * from_booking_id handling, buildConsolidatedLineItems for monthly rollup
 * invoices) -- same convention already fixed in lib/sale-to-booking.ts and
 * lib/sale-to-recurring.ts (commit 3ac8c818). This route (the staff "Convert
 * to booking" button on the quote detail page, POST /api/quotes/[id]/convert)
 * was dividing quote.total_cents by 100 before writing, storing DOLLARS
 * instead -- a $500 quote landed price:5.00, invoicing at $0.05 later.
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
      total_cents: 50_000, // $500.00
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

describe('POST /api/quotes/[id]/convert — bookings.price stored in cents', () => {
  it('stores the full total_cents value on bookings.price, not divided by 100', async () => {
    const res = await POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) })
    expect(res.status).toBe(200)

    const bookings = fake._all('bookings')
    expect(bookings.length).toBe(1)
    expect(bookings[0].price).toBe(50_000)
  })

  it('stores null when the quote has no total_cents', async () => {
    seedQuote({ total_cents: 0 })
    const res = await POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) })
    expect(res.status).toBe(200)

    const bookings = fake._all('bookings')
    expect(bookings[0].price).toBeNull()
  })
})
