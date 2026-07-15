import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/book — same-date duplicate-booking TOCTOU race.
 *
 * BUG (fixed here): the route ran a SELECT count(*) "does this client
 * already have a booking today" check, branched on it, then a separate
 * INSERT of the new booking — two round trips with a gap and no unique
 * constraint backing the check. Two concurrent submits for the same client
 * (double-click / double-tap) could both read count=0 and both pass before
 * either INSERT landed, creating two bookings for the same day.
 *
 * FIX: the duplicate check and the INSERT now run inside a single
 * supabaseAdmin.rpc('create_booking_atomic', ...) call — one DB function
 * (migrations/2026_07_13_client_book_dedupe_atomic.sql) that locks the
 * client row first, so a second concurrent call always recomputes the
 * duplicate check against the first call's already-committed booking.
 *
 * This test's fake `rpc` models exactly that contract: one synchronous pass
 * (no `await` in between the duplicate check and the insert) against shared
 * mutable state, mirroring the DB function's single-statement-per-call
 * atomicity. Firing two submits concurrently via Promise.all proves the
 * route can no longer create two same-day bookings for one client.
 */

const TENANT = { id: 'tid-a', name: 'Test Tenant', phone: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null }
const CLIENT = 'client-a'

type BookingRow = { id: string; tenant_id: string; client_id: string; start_time: string; end_time: string; status: string; price: number; hourly_rate: number; service_type: string }

const holder = vi.hoisted(() => ({
  bookings: new Map<string, BookingRow>(),
  seq: 0,
}))

vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => TENANT }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 10 }) }))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({ open_365: true }) }))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: async () => [] }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/attribution', () => ({ autoAttributeBooking: vi.fn(async () => {}) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
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
      return { data: { ...b, clients: { name: 'Alice', phone: null, email: null, address: null }, client_properties: null }, error: null }
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') {
        const result = { data: { do_not_service: false }, error: null }
        return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => result, maybeSingle: async () => result }) }) }) }
      }
      if (table === 'bookings') return bookingsSelectBuilder()
      return stubChain()
    },
    // Models migrations/2026_07_13_client_book_dedupe_atomic.sql: one
    // indivisible pass (no internal await) recomputing the duplicate check
    // against live shared state.
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      const dup = [...holder.bookings.values()].some(
        (b) =>
          b.tenant_id === args.p_tenant_id &&
          b.client_id === args.p_client_id &&
          b.start_time >= (args.p_day_start as string) &&
          b.start_time < (args.p_day_end as string) &&
          (args.p_active_statuses as string[]).includes(b.status),
      )
      if (dup) return { data: { created: false, reason: 'duplicate_date' }, error: null }
      const id = `bk-${++holder.seq}`
      const booking: BookingRow = {
        id,
        tenant_id: args.p_tenant_id as string,
        client_id: args.p_client_id as string,
        start_time: args.p_start_time as string,
        end_time: args.p_end_time as string,
        status: 'pending',
        price: args.p_price as number,
        hourly_rate: args.p_hourly_rate as number,
        service_type: args.p_service_type as string,
      }
      holder.bookings.set(id, booking)
      return { data: { created: true, booking }, error: null }
    },
  },
}))

import { POST } from './route'

function bookReq(startTime: string) {
  return POST(
    new Request('http://t/api/client/book', {
      method: 'POST',
      body: JSON.stringify({ client_id: CLIENT, start_time: startTime, end_time: startTime }),
    }),
  )
}

beforeEach(() => {
  holder.bookings.clear()
  holder.seq = 0
})

describe('client/book — same-date duplicate race closed', () => {
  it('two concurrent submits for the same client/date cannot both create a booking', async () => {
    const [r1, r2] = await Promise.all([bookReq('2026-07-20T10:00:00'), bookReq('2026-07-20T14:00:00')])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 409])

    const failed = r1.status === 409 ? r1 : r2
    const failedBody = await failed.json()
    expect(failedBody.error).toBe('You already have a booking on this date.')

    const createdForClient = [...holder.bookings.values()].filter((b) => b.client_id === CLIENT)
    expect(createdForClient.length).toBe(1)
  })

  it('positive control: a single submit succeeds', async () => {
    const res = await bookReq('2026-07-21T10:00:00')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBeDefined()
  })

  it('a second submit for a DIFFERENT date is not blocked by the dedupe check', async () => {
    const r1 = await bookReq('2026-07-22T10:00:00')
    expect(r1.status).toBe(200)
    const r2 = await bookReq('2026-07-23T10:00:00')
    expect(r2.status).toBe(200)
  })
})
