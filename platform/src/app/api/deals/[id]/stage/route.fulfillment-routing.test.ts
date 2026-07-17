/**
 * POST /api/deals/[id]/stage — manually closing a deal to Sold (the Kanban
 * drag-and-drop path) always called convertSaleToJob for the deal's proposal,
 * the same wrong-fulfillment-converter bug item (87) fixed on the Stripe
 * quote-deposit webhook. The public no-deposit accept path and the (87) fix
 * both branch 3 ways on close: recurring_type set -> createRecurringSeriesFromQuote,
 * fulfillment_type 'booking' -> createBookingFromQuote, else -> convertSaleToJob
 * (Job board). This manual-close path never got that branch, so dragging a
 * deal with a recurring or booking-type quote to Sold on the Kanban board
 * created a one-off Job board card instead of the recurring schedule series
 * or the Booking the other two close paths would have created for the
 * identical quote. Proves this route now routes identically to those two.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const CLIENT_ID = 'client-1'
const DEAL_ID = 'deal-1'

function params(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: DEAL_ID }) }
}

function moveToSold() {
  currentTenantId = TENANT_ID
  return POST(new Request('https://x.test/api/deals/deal-1/stage', {
    method: 'POST',
    body: JSON.stringify({ stage: 'sold' }),
  }), params())
}

function baseQuote(overrides: Row): Row {
  return {
    id: 'quote-x',
    tenant_id: TENANT_ID,
    status: 'accepted',
    deal_id: DEAL_ID,
    quote_number: 'Q-1',
    total_cents: 20_000,
    client_id: CLIENT_ID,
    contact_email: null,
    title: 'Service Quote',
    notes: null,
    converted_at: null,
    converted_job_id: null,
    converted_booking_id: null,
    converted_schedule_id: null,
    recurring_type: null,
    recurring_start_date: null,
    recurring_preferred_time: null,
    recurring_duration_hours: null,
    fulfillment_type: null,
    created_at: new Date(0).toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Client' }])
  fake._seed('deals', [{
    id: DEAL_ID, tenant_id: TENANT_ID, stage: 'pending', title: 'Deal', value_cents: 20_000, probability: 80,
  }])
})

describe('manual Sold close routes fulfillment the same way the accept path does', () => {
  it('recurring_type set -> creates a recurring_schedules series, NOT a Job', async () => {
    fake._seed('quotes', [baseQuote({ id: 'quote-recurring', recurring_type: 'weekly' })])

    const res = await moveToSold()
    expect(res.status).toBe(200)

    expect(fake._all('recurring_schedules').length).toBe(1)
    expect(fake._all('jobs').length).toBe(0)

    const updatedQuote = fake._all('quotes').find((q) => q.id === 'quote-recurring')
    expect(updatedQuote?.status).toBe('converted')
    expect(updatedQuote?.converted_schedule_id).toBeTruthy()
  })

  it("fulfillment_type 'booking' -> creates a single Booking, NOT a Job", async () => {
    fake._seed('quotes', [baseQuote({ id: 'quote-booking', fulfillment_type: 'booking' })])

    const res = await moveToSold()
    expect(res.status).toBe(200)

    expect(fake._all('bookings').length).toBe(1)
    expect(fake._all('jobs').length).toBe(0)

    const updatedQuote = fake._all('quotes').find((q) => q.id === 'quote-booking')
    expect(updatedQuote?.status).toBe('converted')
    expect(updatedQuote?.converted_booking_id).toBeTruthy()
  })

  it('neither recurring_type nor booking fulfillment -> falls through to the Job board (unchanged default)', async () => {
    fake._seed('quotes', [baseQuote({ id: 'quote-project' })])

    const res = await moveToSold()
    expect(res.status).toBe(200)

    expect(fake._all('jobs').length).toBe(1)
    expect(fake._all('recurring_schedules').length).toBe(0)
    expect(fake._all('bookings').length).toBe(0)
  })
})
