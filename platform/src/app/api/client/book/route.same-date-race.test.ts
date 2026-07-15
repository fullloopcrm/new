import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * SAME-DATE BOOKING RACE — POST /api/client/book's "same-date duplicate"
 * gate is a `SELECT count(*)` read followed by a separate `INSERT`, not one
 * atomic operation (src/app/api/client/book/route.ts). Two concurrent
 * requests for the same (tenant_id, client_id, date) — a double-clicked
 * Book button, a client retry, or two open tabs — can both read count=0
 * before either INSERT commits, creating two active, priced bookings for
 * the same client on the same day.
 *
 * uq_bookings_client_same_date_active (see
 * src/lib/migrations/2026_07_13_bookings_same_date_dedup_PROPOSED.sql) makes
 * the DB the real source of truth for this rule. This test forces the exact
 * race window the pre-check can't close: the count query still reads 0 (the
 * mock, like the happy-path lock, never reflects concurrent writers), but a
 * "concurrent" booking has already landed by the time this request's own
 * INSERT executes, so the DB rejects it with 23505. The route must surface
 * the existing 409 "You already have a booking on this date." instead of a
 * raw 500.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const CLIENT = '11111111-1111-1111-1111-111111111111'

type Row = Record<string, unknown>
let simulateConcurrentWinner = false
let lastBooking: Row | null = null
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row = {}
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; void p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      in: () => c,
      not: () => c,
      is: () => c,
      ilike: () => c,
      gte: () => c,
      lte: () => c,
      order: () => c,
      limit: () => c,
      single: async () => {
        // The route's read-back of the row create_booking_atomic just
        // created (booking creation itself is no longer a plain INSERT —
        // see the rpc() mock below).
        if (table === 'bookings' && lastBooking && eqs.id === lastBooking.id) {
          return { data: lastBooking, error: null }
        }
        if (table === 'clients') return { data: { do_not_service: false }, error: null }
        return { data: null, error: null }
      },
      maybeSingle: async () => {
        // client_id ownership is verified via .maybeSingle() before any
        // booking work runs.
        if (table === 'clients') return { data: { do_not_service: false }, error: null }
        return { data: null, error: null }
      },
      // The same-date duplicate COUNT read — always reads 0, same as the
      // happy-path lock's mock, so the app-level pre-check can't close this
      // race on its own; only the atomic RPC's server-side check can.
      then: (res: (v: { data: unknown; error: unknown; count: number }) => unknown) =>
        res({ data: [], error: null, count: 0 }),
    }
    return c
  }
  return {
    supabaseAdmin: {
      from: (t: string) => chain(t),
      // The same-date duplicate check + INSERT now run atomically inside
      // create_booking_atomic (migrations/2026_07_13_client_book_dedupe_atomic.sql)
      // — precisely the fix that closes the race this file is testing. A
      // "concurrent winner" is simulated as the RPC itself reporting
      // reason: 'duplicate_date', the same as a real losing racer would see.
      rpc: async (fn: string, args: Row) => {
        if (fn !== 'create_booking_atomic') return { data: null, error: { message: `unmocked rpc ${fn}` } }
        if (simulateConcurrentWinner) {
          return { data: { created: false, reason: 'duplicate_date' }, error: null }
        }
        lastBooking = {
          id: BOOKING_ID,
          tenant_id: args.p_tenant_id,
          client_id: args.p_client_id,
          start_time: args.p_start_time,
          end_time: args.p_end_time,
          service_type: args.p_service_type,
          price: args.p_price,
          hourly_rate: args.p_hourly_rate,
          status: 'pending',
          created_at: '2026-08-14T10:00:00Z',
          clients: { name: 'Race Client', email: null, phone: null, address: null },
          client_properties: null,
        }
        return { data: { created: true, booking: { id: BOOKING_ID } }, error: null }
      },
    },
  }
})

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({
    id: TENANT, name: 'Race', phone: '', slug: 'race',
    resend_api_key: null, telnyx_api_key: null, telnyx_phone: null,
    primary_color: null, logo_url: null, email_from: null,
  }),
  tenantSiteUrl: () => 'https://race.example.com',
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))
vi.mock('@/lib/holidays', () => ({ isHoliday: () => null }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({ success: true }) }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => ({}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: async () => {} }))
vi.mock('@/lib/email-templates', () => ({
  adminNewBookingRequestEmail: () => ({ subject: '', html: '' }),
  referralSignupNotifyEmail: () => ({ subject: '', html: '' }),
}))
vi.mock('@/lib/messaging/client-email', () => ({ bookingReceivedEmail: () => ({ subject: '', html: '' }) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ bookingReceived: () => '' }) }))
vi.mock('@/lib/attribution', () => ({ autoAttributeBooking: async () => {} }))
vi.mock('@/lib/client-properties', () => ({
  resolveProperty: async () => null,
  applyPropertyToBookingClient: () => {},
}))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: async () => [] }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: async () => {} }))

import { POST } from '@/app/api/client/book/route'

function bookRequest(body: Row): Request {
  return new Request('https://race.example.com/api/client/book', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/client/book — same-date duplicate race', () => {
  beforeEach(() => {
    simulateConcurrentWinner = false
    lastBooking = null
  })

  it('returns 409 (not 500) when a concurrent request wins the same-date insert race', async () => {
    simulateConcurrentWinner = true

    const res = await POST(
      bookRequest({
        client_id: CLIENT,
        service_type: 'Standard Cleaning',
        date: '2026-08-14',
        time: '10:00 AM',
        estimated_hours: 2,
        price: 15000,
        recurring_type: 'none',
      }),
    )

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('You already have a booking on this date.')
  })

  it('still succeeds normally when there is no concurrent winner', async () => {
    simulateConcurrentWinner = false

    const res = await POST(
      bookRequest({
        client_id: CLIENT,
        service_type: 'Standard Cleaning',
        date: '2026-08-14',
        time: '10:00 AM',
        estimated_hours: 2,
        price: 15000,
        recurring_type: 'none',
      }),
    )

    expect(res.status).toBe(200)
  })
})
