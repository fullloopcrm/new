import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/book — the "one active booking per client per day" gate is
 * check-then-insert (SELECT count, then INSERT if count===0), with no DB
 * backstop. Two concurrent POSTs for the same client+day (double-tapped
 * Submit, or the form open in two tabs) can both pass the SELECT before
 * either INSERT commits, landing two duplicate bookings.
 *
 * FIX: self_book_dedup_key + a partial unique index (migration
 * 067_unique_self_book_dedup.sql) makes the second concurrent insert fail
 * with 23505, which the route now catches and turns into the same 409 the
 * SELECT-based check already returns for the non-race case — instead of an
 * unhandled 500.
 *
 * This test simulates the race directly: both requests' SELECT-count gate
 * sees 0 (as they would if truly concurrent), and only the INSERT layer
 * distinguishes winner from loser via the unique-index error.
 */

const TENANT = { id: 'tenant-a', name: 'Test Tenant', phone: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null }
const CLIENT = 'client-a'

const holder = vi.hoisted(() => ({
  insertedBookings: [] as Array<Record<string, unknown>>,
  seenDedupKeys: new Set<string>(),
}))

vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
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

// Simulates the DB-level partial unique index: the first insert for a given
// self_book_dedup_key succeeds, every subsequent one for the SAME key fails
// with 23505 — exactly what a real concurrent race resolves to once the
// index exists, regardless of what the earlier SELECT count saw.
function bookingsChain() {
  let isInsert = false
  let pendingPayload: Record<string, unknown> | null = null
  const chain: Record<string, unknown> = {
    insert: (payload: Record<string, unknown>) => {
      isInsert = true
      pendingPayload = payload
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
      const payload = pendingPayload as Record<string, unknown>
      const dedupKey = payload.self_book_dedup_key as string | undefined
      if (dedupKey) {
        if (holder.seenDedupKeys.has(dedupKey)) {
          return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "idx_bookings_self_book_dedup_unique"' } }
        }
        holder.seenDedupKeys.add(dedupKey)
      }
      holder.insertedBookings.push(payload)
      return {
        data: {
          id: `bk-${holder.insertedBookings.length}`,
          tenant_id: TENANT.id,
          client_id: CLIENT,
          price: payload.price,
          hourly_rate: payload.hourly_rate,
          created_at: new Date().toISOString(),
          service_type: 'Standard Cleaning',
          clients: { name: 'Alice', phone: null, email: null, address: null },
          client_properties: null,
        },
        error: null,
      }
    },
    // Same-date duplicate SELECT gate: always reports 0 existing bookings,
    // simulating two requests whose SELECT ran concurrently before either
    // INSERT committed (the actual race window this test targets).
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
  holder.seenDedupKeys.clear()
})

describe('concurrent double-submit for the same client+day', () => {
  it('first request succeeds, second (racing) request gets a clean 409, not a 500', async () => {
    const [first, second] = await Promise.all([bookReq({}), bookReq({})])

    const statuses = [first.status, second.status].sort()
    expect(statuses).toEqual([200, 409])
    expect(holder.insertedBookings).toHaveLength(1)

    const loser = first.status === 409 ? first : second
    const loserBody = await loser.json()
    expect(loserBody.error).toBe('You already have a booking on this date.')
  })

  it('two different clients booking the same day do not collide on the dedup key', async () => {
    const [a, b] = await Promise.all([
      bookReq({ client_id: CLIENT }),
      bookReq({ client_id: 'client-b' }),
    ])
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    expect(holder.insertedBookings).toHaveLength(2)
    expect(holder.insertedBookings[0].self_book_dedup_key).toBe(`${CLIENT}:2026-08-01`)
    expect(holder.insertedBookings[1].self_book_dedup_key).toBe('client-b:2026-08-01')
  })
})
