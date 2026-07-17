/**
 * POST /api/deals/[id]/stage — fulfillment routing when a deal is manually
 * dragged to 'sold' on the kanban board.
 *
 * This route used to always call convertSaleToJob for the deal's most recent
 * unconverted quote, regardless of that quote's recurring_type/fulfillment_type
 * -- unlike quotes/public/[token]/accept/route.ts's no-deposit close path,
 * which already branches recurring/booking/job correctly. An admin manually
 * closing a recurring-service deal (or a booking-fulfillment deal) got a
 * one-off Job instead of a recurring_schedules series / Booking -- the same
 * gap independently found and fixed on the Stripe quote-deposit webhook.
 * Zero prior coverage of this branch at all before this file.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'owner' as string,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string }

const convertSaleToJob = vi.hoisted(() => vi.fn(() => Promise.resolve({ job_id: 'job_1', already_converted: false })))
const createRecurringSeriesFromQuote = vi.hoisted(() => vi.fn(() => Promise.resolve({ schedule_id: 'sched_1', bookings_created: 6, already_converted: false })))
const createBookingFromQuote = vi.hoisted(() => vi.fn(() => Promise.resolve({ booking_id: 'book_1', already_converted: false })))

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  return { supabaseAdmin: raw, supabase: raw }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { selena_config: null },
    role: h.role,
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/jobs', () => ({ convertSaleToJob }))
vi.mock('@/lib/sale-to-recurring', () => ({ createRecurringSeriesFromQuote }))
vi.mock('@/lib/sale-to-booking', () => ({ createBookingFromQuote }))

import { POST } from './route'

const TENANT_ID = 'tenant-A'
const DEAL_ID = 'deal-1'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = TENANT_ID
  h.seq = 0
  h.role = 'owner'
  convertSaleToJob.mockClear()
  createRecurringSeriesFromQuote.mockClear()
  createBookingFromQuote.mockClear()
})

describe('POST /api/deals/[id]/stage — sold fulfillment routing', () => {
  it('creates a one-off Job for a plain (non-recurring, non-booking) quote', async () => {
    h.store = {
      deals: [{ id: DEAL_ID, tenant_id: TENANT_ID, stage: 'quoted', title: 'Plain Job', value_cents: 5000, probability: 60 }],
      deal_activities: [],
      quotes: [{ id: 'q_1', tenant_id: TENANT_ID, deal_id: DEAL_ID, converted_job_id: null, created_at: '2026-07-01', recurring_type: null, fulfillment_type: null }],
    }

    const res = await POST(postReq({ stage: 'sold' }), params(DEAL_ID))

    expect(res.status).toBe(200)
    expect(convertSaleToJob).toHaveBeenCalledTimes(1)
    expect(convertSaleToJob).toHaveBeenCalledWith(TENANT_ID, { type: 'quote', quoteId: 'q_1' }, {})
    expect(createRecurringSeriesFromQuote).not.toHaveBeenCalled()
    expect(createBookingFromQuote).not.toHaveBeenCalled()
  })

  it('creates the recurring series (not a one-off Job) when the quote is a recurring service', async () => {
    h.store = {
      deals: [{ id: DEAL_ID, tenant_id: TENANT_ID, stage: 'quoted', title: 'Weekly Cleaning', value_cents: 8000, probability: 60 }],
      deal_activities: [],
      quotes: [{ id: 'q_2', tenant_id: TENANT_ID, deal_id: DEAL_ID, converted_job_id: null, created_at: '2026-07-01', recurring_type: 'weekly', fulfillment_type: null }],
    }

    const res = await POST(postReq({ stage: 'sold' }), params(DEAL_ID))

    expect(res.status).toBe(200)
    expect(createRecurringSeriesFromQuote).toHaveBeenCalledTimes(1)
    expect(createRecurringSeriesFromQuote).toHaveBeenCalledWith(TENANT_ID, 'q_2')
    expect(convertSaleToJob).not.toHaveBeenCalled()
    expect(createBookingFromQuote).not.toHaveBeenCalled()
  })

  it('creates a Booking (not a one-off Job) when the quote is fulfillment_type: booking', async () => {
    h.store = {
      deals: [{ id: DEAL_ID, tenant_id: TENANT_ID, stage: 'quoted', title: 'One-time Move-out', value_cents: 3000, probability: 60 }],
      deal_activities: [],
      quotes: [{ id: 'q_3', tenant_id: TENANT_ID, deal_id: DEAL_ID, converted_job_id: null, created_at: '2026-07-01', recurring_type: null, fulfillment_type: 'booking' }],
    }

    const res = await POST(postReq({ stage: 'sold' }), params(DEAL_ID))

    expect(res.status).toBe(200)
    expect(createBookingFromQuote).toHaveBeenCalledTimes(1)
    expect(createBookingFromQuote).toHaveBeenCalledWith(TENANT_ID, 'q_3')
    expect(convertSaleToJob).not.toHaveBeenCalled()
    expect(createRecurringSeriesFromQuote).not.toHaveBeenCalled()
  })

  it('does nothing when the deal has no unconverted quote', async () => {
    h.store = {
      deals: [{ id: DEAL_ID, tenant_id: TENANT_ID, stage: 'quoted', title: 'No Quote', value_cents: 0, probability: 60 }],
      deal_activities: [],
      quotes: [],
    }

    const res = await POST(postReq({ stage: 'sold' }), params(DEAL_ID))

    expect(res.status).toBe(200)
    expect(convertSaleToJob).not.toHaveBeenCalled()
    expect(createRecurringSeriesFromQuote).not.toHaveBeenCalled()
    expect(createBookingFromQuote).not.toHaveBeenCalled()
  })
})
