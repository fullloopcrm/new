import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/book — the public booking widget's own "booking received" SMS
 * confirmation (the first SMS a client ever gets from the app) never checked
 * clients.sms_consent, unlike the codebase-wide TCPA convention items
 * (19)/(21)/(23) already established for every other client-facing SMS call
 * site (a client who texted STOP should never get another SMS, transactional
 * or not). A returning client who previously opted out and books again
 * (e.g. a phone-in booking taken by staff reusing their info) would still get
 * this confirmation text. Proves the fix: sms_consent:false suppresses the
 * send, true/unset (never opted out) still sends.
 */

const nycMaidFlag = vi.hoisted(() => ({ current: false }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => nycMaidFlag.current }))

const TENANT = { id: 'tid-a', name: 'Test Tenant', phone: null, resend_api_key: null, telnyx_api_key: 'key', telnyx_phone: '+15550000000', email_from: null, primary_color: null, logo_url: null }
const CLIENT = 'client-a'

const holder = vi.hoisted(() => ({
  bookings: new Map<string, Record<string, unknown>>(),
  selenaConfig: null as { emergency_available?: boolean; emergency_rate?: number } | null,
  smsCalls: [] as Array<Record<string, unknown>>,
  clientSmsConsent: true as boolean | null,
}))

vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => ({ ...TENANT, selena_config: holder.selenaConfig }) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 10 }) }))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: async () => [] }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/attribution', () => ({ autoAttributeBooking: vi.fn(async () => {}) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async (args: Record<string, unknown>) => { holder.smsCalls.push(args) }) }))
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
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({ open_365: true }) }))

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
      return { data: b, error: null }
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') {
        return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: { do_not_service: false }, error: null }) }) }) }) }
      }
      if (table === 'bookings') return bookingsSelectBuilder()
      if (table === 'service_types') return stubChain({ data: null, error: null })
      return stubChain()
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      const id = `bk-${holder.bookings.size + 1}`
      const booking = {
        id,
        tenant_id: args.p_tenant_id,
        client_id: args.p_client_id,
        price: args.p_price,
        hourly_rate: args.p_hourly_rate,
        is_emergency: args.p_is_emergency,
        clients: { name: 'Alice', phone: '+15551234567', email: null, address: null, sms_consent: holder.clientSmsConsent },
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

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

beforeEach(() => {
  holder.bookings.clear()
  holder.selenaConfig = null
  holder.smsCalls.length = 0
  holder.clientSmsConsent = true
  nycMaidFlag.current = false
})

describe('client/book — booking-received SMS honors sms_consent', () => {
  it('skips the confirmation SMS for a client who has opted out (sms_consent:false)', async () => {
    holder.clientSmsConsent = false
    const res = await bookReq({})
    expect(res.status).toBe(200)
    await flush()
    expect(holder.smsCalls.length).toBe(0)
  })

  it('sends the confirmation SMS for a client who has not opted out (positive control)', async () => {
    holder.clientSmsConsent = true
    const res = await bookReq({})
    expect(res.status).toBe(200)
    await flush()
    expect(holder.smsCalls.length).toBe(1)
    expect(holder.smsCalls[0].to).toBe('+15551234567')
  })
})
