import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/book — client-controlled pricing on a PUBLIC, unauthenticated endpoint.
 *
 * BUG (fixed here): the route trusted body.price as a direct total override
 * with no floor, and body.hourly_rate as a raw rate with no floor/cap. An
 * anonymous POST to /api/client/book with e.g. hourly_rate: 1 (or price: 1)
 * produced a booking whose stored `price`/`hourly_rate` becomes the
 * authoritative charge amount downstream (payment-processor.ts's
 * expectedCents, payments/checkout/route.ts's Stripe amount) -- a real
 * unauthenticated underpayment/business-logic bug, not just a UI display
 * issue.
 *
 * FIX: body.price is no longer trusted at all (bkPrice is always derived
 * server-side from rate x hours). body.hourly_rate is floored/capped to
 * [20, 200] for generic tenants; for the NYC Maid tenant specifically
 * (real production form confirmed sending a client-computed hourly_rate)
 * it's clamped to the tenant's two published non-emergency rates {59, 69}.
 */

const nycMaidFlag = vi.hoisted(() => ({ current: false }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => nycMaidFlag.current }))

const TENANT = { id: 'tenant-a', name: 'Test Tenant', phone: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null }
const CLIENT = 'client-a'

const holder = vi.hoisted(() => ({
  insertedBookings: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => TENANT }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 10 }) }))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: async () => [] }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/attribution', () => ({ autoAttributeBooking: vi.fn(async () => {}) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/client-properties', () => ({
  resolveProperty: vi.fn(async () => null),
  applyPropertyToBookingClient: vi.fn(() => {}),
}))
vi.mock('@/lib/messaging/client-email', () => ({ bookingReceivedEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ bookingReceived: () => 'sms' }) }))
vi.mock('@/lib/email-templates', () => ({
  adminNewBookingRequestEmail: () => ({ subject: 's', html: 'h' }),
  referralSignupNotifyEmail: () => ({ subject: 's', html: 'h' }),
}))
vi.mock('@/lib/nycmaid/recurring-discount', () => ({ applyRecurringDiscount: (price: number) => price }))

function stubChain(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    eq: () => chain,
    is: () => chain,
    in: () => chain,
    gte: () => chain,
    lte: () => chain,
    ilike: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
  }
  return chain
}

function bookingsChain() {
  let isInsert = false
  const chain: Record<string, unknown> = {
    insert: (payload: Record<string, unknown>) => {
      isInsert = true
      holder.insertedBookings.push(payload)
      return chain
    },
    select: () => chain,
    update: () => chain,
    eq: () => chain,
    is: () => chain,
    in: () => chain,
    gte: () => chain,
    lte: () => chain,
    ilike: () => chain,
    order: () => chain,
    single: async () => {
      if (!isInsert) return { data: null, error: { message: 'not found' } }
      const last = holder.insertedBookings[holder.insertedBookings.length - 1]
      return {
        data: {
          id: `bk-${holder.insertedBookings.length}`,
          tenant_id: TENANT.id,
          client_id: CLIENT,
          price: last.price,
          hourly_rate: last.hourly_rate,
          created_at: new Date().toISOString(),
          service_type: 'Standard Cleaning',
          clients: { name: 'Alice', phone: null, email: null, address: null },
          client_properties: null,
        },
        error: null,
      }
    },
    maybeSingle: async () => ({ data: null, error: null }),
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve({ count: 0, data: [], error: null }).then(res, rej),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') {
        return { select: () => ({ eq: () => ({ eq: () => ({
          single: async () => ({ data: { do_not_service: false }, error: null }),
          maybeSingle: async () => ({ data: { do_not_service: false }, error: null }),
        }) }) }) }
      }
      if (table === 'bookings') return bookingsChain()
      return stubChain()
    },
  },
}))

import { POST } from './route'

function bookReq(body: Record<string, unknown>) {
  return POST(
    new Request('http://t/api/client/book', {
      method: 'POST',
      body: JSON.stringify({ client_id: CLIENT, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00', ...body }),
    }),
  )
}

beforeEach(() => {
  holder.insertedBookings.length = 0
  nycMaidFlag.current = false
})

describe('generic tenant — client-supplied price/rate cannot be pushed below the floor', () => {
  it('a $1/hr submission is clamped up to the $20/hr floor, not honored', async () => {
    const res = await bookReq({ hourly_rate: 1, estimated_hours: 2 })
    expect(res.status).toBe(200)
    expect(holder.insertedBookings[0].hourly_rate).toBe(20)
    expect(holder.insertedBookings[0].price).toBe(20 * 2 * 100)
  })

  it('a direct price:1 override is ignored — price is always derived from rate × hours', async () => {
    const res = await bookReq({ hourly_rate: 75, estimated_hours: 3, price: 1 })
    expect(res.status).toBe(200)
    expect(holder.insertedBookings[0].price).toBe(75 * 3 * 100)
  })

  it('a near-zero estimated_hours cannot slip past the rate floor to zero out the total', async () => {
    const res = await bookReq({ hourly_rate: 75, estimated_hours: 0.001 })
    expect(res.status).toBe(200)
    // Hours floored to 1 — total can't collapse toward zero via a tiny hours value.
    expect(holder.insertedBookings[0].price).toBe(75 * 1 * 100)
  })

  it('an absurdly high rate is capped at $200/hr', async () => {
    const res = await bookReq({ hourly_rate: 999999, estimated_hours: 2 })
    expect(res.status).toBe(200)
    expect(holder.insertedBookings[0].hourly_rate).toBe(200)
  })

  it('a legitimate rate within bounds passes through unchanged', async () => {
    const res = await bookReq({ hourly_rate: 75, estimated_hours: 2 })
    expect(res.status).toBe(200)
    expect(holder.insertedBookings[0].hourly_rate).toBe(75)
    expect(holder.insertedBookings[0].price).toBe(75 * 2 * 100)
  })
})

describe('recurring_type — bare "monthly" cadence is normalized before storing', () => {
  // RemoteBookForm.tsx's CADENCE dropdown sends the bare literal 'monthly'.
  // RecurringType (lib/recurring.ts) has no bare 'monthly' member, only
  // monthly_date/monthly_weekday -- an unnormalized value would render as
  // unformatted raw text ("Schedule: monthly") instead of a label
  // ("Schedule: Monthly") wherever formatRecurringLabel reads it.
  it('normalizes "monthly" to "monthly_date"', async () => {
    const res = await bookReq({ hourly_rate: 75, estimated_hours: 2, recurring_type: 'monthly' })
    expect(res.status).toBe(200)
    expect(holder.insertedBookings[0].recurring_type).toBe('monthly_date')
  })

  it('leaves other recurring types (e.g. weekly) unchanged', async () => {
    const res = await bookReq({ hourly_rate: 75, estimated_hours: 2, recurring_type: 'weekly' })
    expect(res.status).toBe(200)
    expect(holder.insertedBookings[0].recurring_type).toBe('weekly')
  })

  it('"none" is stored as null', async () => {
    const res = await bookReq({ hourly_rate: 75, estimated_hours: 2, recurring_type: 'none' })
    expect(res.status).toBe(200)
    expect(holder.insertedBookings[0].recurring_type).toBeNull()
  })
})

describe('NYC Maid tenant — hourly_rate clamped to the published {59, 69} tiers', () => {
  beforeEach(() => {
    nycMaidFlag.current = true
  })

  it('a $1/hr submission falls back to the $69/hr default, not honored', async () => {
    const res = await bookReq({ hourly_rate: 1, estimated_hours: 2 })
    expect(res.status).toBe(200)
    expect(holder.insertedBookings[0].hourly_rate).toBe(69)
  })

  it('the legitimate $59 (client-supplies) tier is honored', async () => {
    const res = await bookReq({ hourly_rate: 59, estimated_hours: 2 })
    expect(res.status).toBe(200)
    expect(holder.insertedBookings[0].hourly_rate).toBe(59)
  })

  it('the legitimate $69 (we-bring) tier is honored', async () => {
    const res = await bookReq({ hourly_rate: 69, estimated_hours: 2 })
    expect(res.status).toBe(200)
    expect(holder.insertedBookings[0].hourly_rate).toBe(69)
  })
})
