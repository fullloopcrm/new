import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/book — PUBLIC unauthenticated endpoint accepted an arbitrary
 * body.client_id with no verification it belongs to the requesting tenant.
 *
 * BUG: the only check touching client_id was the do-not-service gate, which
 * queried `.eq('id', client_id).eq('tenant_id', tenant.id)`. When client_id
 * belonged to a DIFFERENT tenant (or didn't exist), that query simply found
 * no row and `dnsCheck?.do_not_service` was falsy — so the code silently
 * continued instead of rejecting. The unverified clientId then flowed into
 * resolveProperty() (reads/creates client_properties by client_id alone) and
 * into the bookings insert, whose response joins clients(*) + client_properties(*)
 * — a caller who knew or guessed another tenant's client UUID could create a
 * booking against it and get that victim client's name/phone/email/address
 * back in the JSON response, plus pollute their property list and trigger
 * booking-confirmation email/SMS to that unrelated client.
 *
 * FIX: reject the request with 400 when a client_id is supplied but doesn't
 * resolve to a row scoped to this tenant.
 */

const TENANT = { id: 'tenant-a', name: 'Test Tenant', phone: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null }
const FOREIGN_CLIENT = 'client-belonging-to-another-tenant'

const holder = vi.hoisted(() => ({
  insertedBookings: [] as Array<Record<string, unknown>>,
  resolvePropertyCalls: 0,
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
  resolveProperty: vi.fn(async () => {
    holder.resolvePropertyCalls++
    // Simulates finding the FOREIGN client's real property/address.
    return { id: 'foreign-property', address: '1 Victim St', latitude: null, longitude: null }
  }),
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
          client_id: FOREIGN_CLIENT,
          price: last.price,
          hourly_rate: last.hourly_rate,
          created_at: new Date().toISOString(),
          service_type: 'Standard Cleaning',
          // This is exactly what a real tenant-unscoped join would leak: the
          // FOREIGN client's real PII, returned to whoever sent the request.
          clients: { name: 'Victim Real Name', phone: '555-0100', email: 'victim@example.com', address: '1 Victim St' },
          client_properties: { id: 'foreign-property', address: '1 Victim St' },
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
        // Real DB behavior for a client_id that exists but belongs to a
        // DIFFERENT tenant: .eq('id', foreignId).eq('tenant_id', tenant.id)
        // matches nothing.
        return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: { code: 'PGRST116', message: 'No rows found' } }), maybeSingle: async () => ({ data: null, error: null }) }) }) }) }
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
      body: JSON.stringify({
        client_id: FOREIGN_CLIENT,
        address: '1 Victim St',
        start_time: '2026-08-01T10:00:00',
        end_time: '2026-08-01T12:00:00',
        ...body,
      }),
    }),
  )
}

beforeEach(() => {
  holder.insertedBookings.length = 0
  holder.resolvePropertyCalls = 0
})

describe('a client_id from another tenant is rejected, not silently used', () => {
  it('does not create a booking and does not leak the foreign client PII in the response', async () => {
    const res = await bookReq({})
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBeTruthy()
    expect(holder.insertedBookings.length).toBe(0)
    expect(holder.resolvePropertyCalls).toBe(0)
  })
})
