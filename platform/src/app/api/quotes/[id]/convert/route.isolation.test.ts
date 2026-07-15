import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/quotes/[id]/convert (converted to tenantDb).
 *
 * The route loads the quote by id via tenantDb (`.eq('tenant_id', ctx)`) before
 * creating a booking from it. Converting ANOTHER tenant's quote must 404 before
 * any booking is inserted — otherwise a caller could materialize a booking (and
 * a client) out of a foreign tenant's quote. That is the wrong-tenant probe.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

// logQuoteEvent writes an audit row to the real DB — stub it (the probe path
// never reaches it, the positive path does).
vi.mock('@/lib/quote', () => ({ logQuoteEvent: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    quotes: [
      { id: 'quote-a', tenant_id: CTX_TENANT, status: 'accepted', client_id: 'client-a', total_cents: 20000, quote_number: 'Q-A1', converted_booking_id: null },
      { id: 'quote-b', tenant_id: OTHER_TENANT, status: 'accepted', client_id: 'client-b', total_cents: 99000, quote_number: 'Q-B1', converted_booking_id: null },
    ],
    clients: [],
    bookings: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function convert(id: string, body: unknown = {}) {
  return POST(
    new Request('http://t/api/quotes/' + id + '/convert', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  )
}

describe('quotes/[id]/convert POST — tenant isolation', () => {
  it('positive control: tenant A converts its OWN accepted quote into a booking', async () => {
    const res = await convert('quote-a', { start_time: '2026-08-01T09:00:00.000Z', end_time: '2026-08-01T11:00:00.000Z' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.client_id).toBe('client-a')
    expect(body.booking_id).toBeTruthy()
    // The booking was stamped for tenant A, not the caller's forgeable value.
    const bookingInsert = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(bookingInsert).toBeDefined()
    expect(bookingInsert!.rows[0].tenant_id).toBe(CTX_TENANT)
  })

  it("wrong-tenant probe: converting tenant B's quote id 404s, never creates a booking", async () => {
    const res = await convert('quote-b', { start_time: '2026-08-01T09:00:00.000Z' })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Not found')
    // No booking (or client) was materialized from the foreign quote.
    expect(h.capture.inserts.filter((i) => i.table === 'bookings')).toHaveLength(0)
    expect(h.seed.quotes.find((r) => r.id === 'quote-b')!.converted_booking_id).toBeNull()
  })
})
