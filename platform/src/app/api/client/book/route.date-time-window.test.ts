import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/book — the date+time (no explicit start_time/end_time) fallback
 * branch built end_time via raw `hour + duration` string interpolation
 * instead of the shared computeNaiveVisitWindow() helper every other
 * recurring-booking writer uses. A job long enough to cross midnight from a
 * late time slot (e.g. a 4:00 PM slot with RemoteBookForm.tsx's own
 * estimated_hours default of 10) produced a malformed timestamp string like
 * "...T25:00:00" -- an invalid hour-of-day -- instead of rolling over to the
 * next calendar date.
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
          start_time: last.start_time,
          end_time: last.end_time,
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
      body: JSON.stringify({ client_id: CLIENT, hourly_rate: 75, ...body }),
    }),
  )
}

beforeEach(() => {
  holder.insertedBookings.length = 0
  nycMaidFlag.current = false
})

describe('date+time fallback — end_time rolls over to the next day instead of an invalid hour', () => {
  it('a 4:00 PM slot with a 9h job rolls end_time to 01:00:00 the next calendar day', async () => {
    const res = await bookReq({ date: '2026-08-15', time: '4:00 PM', estimated_hours: 9 })
    expect(res.status).toBe(200)
    expect(holder.insertedBookings[0].start_time).toBe('2026-08-15T16:00:00')
    expect(holder.insertedBookings[0].end_time).toBe('2026-08-16T01:00:00')
  })

  it('a same-day slot (no midnight crossing) is unaffected', async () => {
    const res = await bookReq({ date: '2026-08-15', time: '9:00 AM', estimated_hours: 3 })
    expect(res.status).toBe(200)
    expect(holder.insertedBookings[0].start_time).toBe('2026-08-15T09:00:00')
    expect(holder.insertedBookings[0].end_time).toBe('2026-08-15T12:00:00')
  })
})
