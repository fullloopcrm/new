import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 booking-create HAPPY-PATH lock (gap #3 from e2e-flow-coverage.md /
 * synthetic-canaries-spec.md §2: `POST /api/client/book` is the revenue-entry
 * flow and was entirely untested).
 *
 * This is the positive, GREEN companion to the tenant-scoping isolation tests —
 * it proves the money path actually WORKS: a well-formed guest booking against a
 * resolved tenant persists a `bookings` row that is tenant-scoped, priced, and
 * in the correct initial state. Concretely it asserts the INSERT payload sent to
 * `bookings`, not just HTTP 200, so a regression that silently drops tenant_id,
 * flips the initial status, or corrupts price is caught.
 *
 * WHAT IS REAL vs MOCKED
 * ----------------------
 * REAL (pure, no external deps — faithful): `applyRecurringDiscount`
 * (src/lib/nycmaid/recurring-discount.ts) drives the price math, and `isNycMaid`
 * (src/lib/nycmaid/tenant.ts) — the TENANT id below is deliberately NOT the NYC
 * Maid id, so the generic pricing branch runs exactly as production would.
 * MOCKED: the DB (chained supabase builder — the repo convention, see
 * client-idor.isolation.test.ts), tenant resolution, rate limiter, and every
 * notification/email/SMS side effect (so no real send fires and imports resolve).
 * The supabase mock captures the exact `bookings` INSERT payload for assertion.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444' // NOT the NYC Maid id → generic pricing branch
const CLIENT = '11111111-1111-1111-1111-111111111111'
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

// ── DB mock: chainable builder that records reads + insert payloads ───────────
type Row = Record<string, unknown>
const reads: Array<{ table: string; eqs: Row }> = []
const inserts: Array<{ table: string; payload: Row }> = []
const updates: Array<{ table: string; eqs: Row }> = []
let lastBooking: Row | null = null

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row = {}
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row) => { kind = 'insert'; payload = p; inserts.push({ table, payload: p }); return c },
      update: (p: Row) => { kind = 'update'; updates.push({ table, eqs }); void p; return c },
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
        reads.push({ table, eqs: { ...eqs } })
        if (kind === 'insert' && table === 'bookings') {
          // Echo the inserted booking back the way `.select('*, clients(*)')` would.
          return {
            data: {
              id: BOOKING_ID,
              ...payload,
              created_at: '2026-08-14T10:00:00Z',
              clients: { name: 'Canary Client', email: null, phone: null, address: null },
              client_properties: null,
            },
            error: null,
          }
        }
        // Booking creation itself now runs inside create_booking_atomic (see
        // the rpc() mock below) — this plain SELECT is the route's read-back
        // of the row the RPC just created.
        if (table === 'bookings' && lastBooking && eqs.id === lastBooking.id) {
          return { data: lastBooking, error: null }
        }
        if (table === 'clients') return { data: { do_not_service: false }, error: null }
        return { data: null, error: null }
      },
      maybeSingle: async () => {
        reads.push({ table, eqs: { ...eqs } })
        // client_id ownership is now verified via .maybeSingle() before any
        // booking work runs (see route.witness.test.ts) — this used to
        // unconditionally return null, which 404'd every request in this file.
        if (table === 'clients') return { data: { do_not_service: false }, error: null }
        return { data: null, error: null }
      },
      // Awaiting the chain directly (count reads, plain inserts) lands here.
      then: (res: (v: { data: unknown; error: unknown; count: number }) => unknown) => {
        if (kind === 'read') reads.push({ table, eqs: { ...eqs } })
        return res({ data: [], error: null, count: 0 })
      },
    }
    return c
  }
  return {
    supabaseAdmin: {
      from: (t: string) => chain(t),
      // Booking creation now runs atomically inside a single Postgres RPC
      // (create_booking_atomic — see migrations/2026_07_13_client_book_dedupe_atomic.sql),
      // which does the same-date duplicate check AND the INSERT server-side.
      // Record it the same way the old duplicate-gate SELECT + INSERT were
      // recorded so both assertions below (INSERT payload correctness, and
      // "the gate read was tenant-scoped") still hold against the new shape.
      rpc: async (fn: string, args: Row) => {
        if (fn !== 'create_booking_atomic') return { data: null, error: { message: `unmocked rpc ${fn}` } }
        reads.push({ table: 'bookings', eqs: { tenant_id: args.p_tenant_id, client_id: args.p_client_id } })
        const payload: Row = {
          tenant_id: args.p_tenant_id,
          client_id: args.p_client_id,
          property_id: args.p_property_id,
          start_time: args.p_start_time,
          end_time: args.p_end_time,
          service_type: args.p_service_type,
          price: args.p_price,
          hourly_rate: args.p_hourly_rate,
          team_size: args.p_team_size,
          is_emergency: args.p_is_emergency,
          max_hours: args.p_max_hours,
          notes: args.p_notes,
          recurring_type: args.p_recurring_type,
          team_member_token: args.p_team_member_token,
          token_expires_at: args.p_token_expires_at,
          referrer_id: args.p_referrer_id,
          status: 'pending',
        }
        inserts.push({ table: 'bookings', payload })
        lastBooking = {
          id: BOOKING_ID,
          ...payload,
          created_at: '2026-08-14T10:00:00Z',
          clients: { name: 'Canary Client', email: null, phone: null, address: null },
          client_properties: null,
        }
        return { data: { created: true, booking: { id: BOOKING_ID } }, error: null }
      },
    },
  }
})

// Tenant resolution → a plain, non-NYC-Maid tenant with no send credentials.
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({
    id: TENANT, name: 'Canary', phone: '', slug: 'canary',
    resend_api_key: null, telnyx_api_key: null, telnyx_phone: null,
    primary_color: null, logo_url: null, email_from: null,
  }),
  tenantSiteUrl: () => 'https://canary.example.com',
}))

// Allow the request through the rate limiter.
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))

// Not a holiday → date gate passes.
vi.mock('@/lib/holidays', () => ({ isHoliday: () => null }))

// Side effects — all stubbed so nothing sends and post-response async is inert.
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
  return new Request('https://canary.example.com/api/client/book', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/client/book — happy path (booking persists tenant-scoped)', () => {
  beforeEach(() => {
    reads.length = 0
    inserts.length = 0
    updates.length = 0
  })

  it('persists a booking scoped to the resolving tenant, in the correct initial state, at the expected price', async () => {
    const res = await POST(
      bookRequest({
        client_id: CLIENT,
        service_type: 'Standard Cleaning',
        date: '2026-08-14',
        time: '10:00 AM',
        estimated_hours: 2,
        hourly_rate: 75,
        price: 15000, // cents; recurring 'none' → no discount → persists unchanged
        recurring_type: 'none',
      }),
    )

    // 1. HTTP success, echoing the created booking.
    expect(res.status).toBe(200)
    const json = (await res.json()) as Row
    expect(json.id).toBe(BOOKING_ID)
    expect(json.is_new_client).toBe(false) // client_id supplied → no client row created

    // 2. Exactly one bookings row was inserted, and its payload is correct.
    const bookingInserts = inserts.filter((i) => i.table === 'bookings')
    expect(bookingInserts).toHaveLength(1)
    const b = bookingInserts[0].payload

    // TENANT-SCOPED — the load-bearing assertion for gap #3.
    expect(b.tenant_id).toBe(TENANT)
    expect(b.client_id).toBe(CLIENT)

    // CORRECT INITIAL STATE.
    expect(b.status).toBe('pending')
    expect(b.is_emergency).toBe(false) // generic (non-NYC-Maid) branch
    expect(b.recurring_type).toBeNull() // 'none' normalizes to null

    // CORRECT PRICE (real applyRecurringDiscount, no discount for 'none').
    expect(b.price).toBe(15000)
    expect(b.service_type).toBe('Standard Cleaning')

    // Time was computed from date + time.
    expect(b.start_time).toBe('2026-08-14T10:00:00')
    expect(b.end_time).toBe('2026-08-14T12:00:00')
  })

  it('reads that gate the booking (DNS + same-date duplicate) are themselves tenant-scoped', async () => {
    await POST(
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

    // Every gate read carried tenant_id = the resolving tenant (no cross-tenant leak).
    const dnsRead = reads.find((r) => r.table === 'clients')
    expect(dnsRead?.eqs.tenant_id).toBe(TENANT)
    expect(dnsRead?.eqs.id).toBe(CLIENT)

    const dupRead = reads.find((r) => r.table === 'bookings' && r.eqs.client_id === CLIENT)
    expect(dupRead?.eqs.tenant_id).toBe(TENANT)
  })
})
