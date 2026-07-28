import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/book — client-controlled pricing on a PUBLIC, unauthenticated endpoint.
 *
 * BUG (fixed here): the route trusted body.price as a direct total override
 * with no floor, and body.hourly_rate as a raw rate with no floor/cap. An
 * anonymous POST to /api/client/book with e.g. hourly_rate: 1 (or price: 1)
 * produced a booking whose stored `price`/`hourly_rate` becomes the
 * authoritative charge amount downstream (payment-processor.ts's
 * expectedCents, payments/checkout/route.ts's Stripe amount) — a real
 * unauthenticated underpayment/business-logic bug, not just a UI display
 * issue.
 *
 * FIX: body.price is no longer trusted at all (bkPrice is always derived
 * server-side from rate × hours). body.hourly_rate is floored/capped to
 * [20, 200] for generic tenants; for the NYC Maid tenant specifically
 * (real production form confirmed sending a client-computed hourly_rate)
 * it's clamped to the tenant's two published non-emergency rates {59, 69}.
 */

const nycMaidFlag = vi.hoisted(() => ({ current: false }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => nycMaidFlag.current }))

const TENANT = { id: 'tid-a', name: 'Test Tenant', phone: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null }
const CLIENT = 'client-a'

const holder = vi.hoisted(() => ({
  rpcCalls: [] as Array<Record<string, unknown>>,
  bookings: new Map<string, Record<string, unknown>>(),
  // New-vs-existing client resolution (email/phone lookup, then
  // insert-if-absent) — configurable per test, defaulting to "no match" so
  // the creation branch (isNewClient = true) runs unless a test opts a
  // client in as already-existing.
  clientLookup: { emailMatchId: null as string | null, phoneMatchId: null as string | null },
  nextNewClientId: 0,
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
vi.mock('@/lib/holidays', () => ({ isHoliday: () => null }))
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
vi.mock('@/lib/client-contacts', () => ({ createPrimaryContact: vi.fn(async () => {}) }))

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
    order: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
  }
  return chain
}

function bookingsSelectBuilder() {
  let filterId: string | undefined
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: string) => {
      if (col === 'id') filterId = val
      return chain
    },
    single: async () => {
      const b = holder.bookings.get(filterId!)
      if (!b) return { data: null, error: { message: 'not found' } }
      return { data: b, error: null }
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') {
        // Three distinct callers share this one table mock:
        //  1. Ownership check (body.client_id path):
        //     .select('do_not_service').eq('id',..).eq('tenant_id',..).maybeSingle()
        //  2/3. New-vs-existing resolution (no body.client_id), via tenantDb —
        //     same underlying supabaseAdmin clients-table mock — email lookup
        //     (.ilike + .maybeSingle), phone lookup (.eq('phone',..) +
        //     .maybeSingle), then .insert(...).select().single() if neither hit.
        const ownerResult = { data: { do_not_service: false }, error: null }
        let mode: 'owner' | 'email' | 'phone' | 'insert' = 'owner'
        let insertedRow: Record<string, unknown> | null = null
        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: (col: string) => {
            if (col === 'phone') mode = 'phone'
            return chain
          },
          ilike: () => { mode = 'email'; return chain },
          insert: (data: Record<string, unknown>) => { mode = 'insert'; insertedRow = data; return chain },
          maybeSingle: async () => {
            if (mode === 'email') return { data: holder.clientLookup.emailMatchId ? { id: holder.clientLookup.emailMatchId } : null, error: null }
            if (mode === 'phone') return { data: holder.clientLookup.phoneMatchId ? { id: holder.clientLookup.phoneMatchId } : null, error: null }
            return ownerResult
          },
          single: async () => {
            if (mode === 'insert') {
              holder.nextNewClientId += 1
              return { data: { id: `new-client-${holder.nextNewClientId}`, ...insertedRow }, error: null }
            }
            return ownerResult
          },
        }
        return chain
      }
      if (table === 'bookings') return bookingsSelectBuilder()
      return stubChain()
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      holder.rpcCalls.push(args)
      const id = `bk-${holder.rpcCalls.length}`
      const booking = {
        id,
        tenant_id: args.p_tenant_id,
        client_id: args.p_client_id,
        price: args.p_price,
        hourly_rate: args.p_hourly_rate,
        clients: { name: 'Alice', phone: null, email: null, address: null },
        client_properties: null,
      }
      holder.bookings.set(id, booking)
      return { data: { created: true, booking }, error: null }
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

// No client_id — exercises the email/phone-lookup-then-create path, so
// isNewClient is true unless a test pre-registers a match via
// holder.clientLookup. 2026-08-01 is a Saturday, 2026-08-02 a Sunday.
function bookReqNewClient(body: Record<string, unknown>) {
  return POST(
    new Request('http://t/api/client/book', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Nora NewClient', email: 'nora@example.com', phone: '5551234567', address: '1 Main St',
        start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00',
        ...body,
      }),
    }),
  )
}

beforeEach(() => {
  holder.rpcCalls.length = 0
  holder.bookings.clear()
  holder.clientLookup = { emailMatchId: null, phoneMatchId: null }
  holder.nextNewClientId = 0
  nycMaidFlag.current = false
})

describe('generic tenant — client-supplied price/rate cannot be pushed below the floor', () => {
  it('a $1/hr submission is clamped up to the $20/hr floor, not honored', async () => {
    const res = await bookReq({ hourly_rate: 1, estimated_hours: 2 })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_hourly_rate).toBe(20)
    expect(holder.rpcCalls[0].p_price).toBe(20 * 2 * 100)
  })

  it('a direct price:1 override is ignored — price is always derived from rate × hours', async () => {
    const res = await bookReq({ hourly_rate: 75, estimated_hours: 3, price: 1 })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_price).toBe(75 * 3 * 100)
  })

  it('a near-zero estimated_hours cannot slip past the rate floor to zero out the total', async () => {
    const res = await bookReq({ hourly_rate: 75, estimated_hours: 0.001 })
    expect(res.status).toBe(200)
    // Hours floored to 1 — total can't collapse toward zero via a tiny hours value.
    expect(holder.rpcCalls[0].p_price).toBe(75 * 1 * 100)
  })

  it('an absurdly high rate is capped at $200/hr', async () => {
    const res = await bookReq({ hourly_rate: 999999, estimated_hours: 2 })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_hourly_rate).toBe(200)
  })

  it('a legitimate rate within bounds passes through unchanged', async () => {
    const res = await bookReq({ hourly_rate: 75, estimated_hours: 2 })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_hourly_rate).toBe(75)
    expect(holder.rpcCalls[0].p_price).toBe(75 * 2 * 100)
  })
})

describe('NYC Maid tenant — hourly_rate clamped to the published {59, 69} tiers', () => {
  beforeEach(() => {
    nycMaidFlag.current = true
  })

  it('a $1/hr submission falls back to the $69/hr default, not honored', async () => {
    const res = await bookReq({ hourly_rate: 1, estimated_hours: 2 })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_hourly_rate).toBe(69)
  })

  it('the legitimate $59 (client-supplies) tier is honored', async () => {
    const res = await bookReq({ hourly_rate: 59, estimated_hours: 2 })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_hourly_rate).toBe(59)
  })

  it('the legitimate $69 (we-bring) tier is honored', async () => {
    const res = await bookReq({ hourly_rate: 69, estimated_hours: 2 })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_hourly_rate).toBe(69)
  })
})

describe('NYC Maid tenant — weekend (Sat/Sun) surcharge, new clients only', () => {
  beforeEach(() => {
    nycMaidFlag.current = true
  })

  it('a brand-new client booking Saturday at the we-bring rate is charged $79/hr, not $69', async () => {
    const res = await bookReqNewClient({ hourly_rate: 79, estimated_hours: 2, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00' })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_hourly_rate).toBe(79)
  })

  it('a brand-new client booking Sunday at the client-supplies rate is charged $69/hr, not $59', async () => {
    const res = await bookReqNewClient({ hourly_rate: 69, estimated_hours: 2, start_time: '2026-08-02T10:00:00', end_time: '2026-08-02T12:00:00' })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_hourly_rate).toBe(69)
  })

  it('a tampered $1/hr submission on a new-client weekend booking falls back to the $79/hr default, not honored', async () => {
    const res = await bookReqNewClient({ hourly_rate: 1, estimated_hours: 2, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00' })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_hourly_rate).toBe(79)
  })

  it('a stale weekday rate ($59) sent for a new-client weekend booking is rejected in favor of the $79 weekend default — the weekday and weekend tiers are never cross-honored', async () => {
    const res = await bookReqNewClient({ hourly_rate: 59, estimated_hours: 2, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00' })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_hourly_rate).toBe(79)
  })

  it('an EXISTING client (client_id provided) booking Saturday keeps the old $59/$69 tiers — the weekend surcharge never applies to them', async () => {
    const res = await bookReq({ hourly_rate: 79, estimated_hours: 2, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00' })
    expect(res.status).toBe(200)
    // 79 isn't a valid weekday tier, so it falls back to the $69 weekday default — never honored as-is.
    expect(holder.rpcCalls[0].p_hourly_rate).toBe(69)
  })

  it('a returning client matched by email on a weekend booking also keeps the old tiers, not the surcharge', async () => {
    holder.clientLookup.emailMatchId = 'existing-client-1'
    const res = await bookReqNewClient({ hourly_rate: 79, estimated_hours: 2, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00' })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_client_id).toBe('existing-client-1')
    expect(holder.rpcCalls[0].p_hourly_rate).toBe(69)
  })

  it('Friday is NOT a weekend day — a new client booking Friday gets the normal weekday tiers', async () => {
    const res = await bookReqNewClient({ hourly_rate: 59, estimated_hours: 2, start_time: '2026-08-07T10:00:00', end_time: '2026-08-07T12:00:00' })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_hourly_rate).toBe(59)
  })

  it('a new client booking a weekday (Monday) is unaffected by the weekend surcharge', async () => {
    const res = await bookReqNewClient({ hourly_rate: 69, estimated_hours: 2, start_time: '2026-08-03T10:00:00', end_time: '2026-08-03T12:00:00' })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_hourly_rate).toBe(69)
  })
})
