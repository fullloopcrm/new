import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/book — the admin's own "new booking" notifications were structurally
 * blind to is_emergency (archetype-depth finding, EMERGENCY-24-7-ARCHETYPE-
 * GAPS-AND-FRICTION-2026-07-16.md). NYC Maid already has a bespoke bolt-on
 * 🚨 SMS for this exact trigger (isNycMaid + bkIsEmergency below); the actual
 * plumbing/HVAC/restoration/tree-service archetype this session tracks had
 * no equivalent — both real admin-facing paths (notify('new_booking') and
 * adminNewBookingRequestEmail/emailAdmins) rendered a same-day burst-pipe
 * booking byte-identical to one made three weeks out. This proves the fix:
 * both paths now carry the urgency signal through.
 */

const nycMaidFlag = vi.hoisted(() => ({ current: false }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => nycMaidFlag.current }))

const TENANT = { id: 'tid-a', name: 'Test Tenant', phone: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null }
const CLIENT = 'client-a'

const holder = vi.hoisted(() => ({
  bookings: new Map<string, Record<string, unknown>>(),
  selenaConfig: null as { emergency_available?: boolean; emergency_rate?: number } | null,
  notifyCalls: [] as Array<Record<string, unknown>>,
  adminEmailCalls: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => ({ ...TENANT, selena_config: holder.selenaConfig }) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 10 }) }))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: async () => [] }))
vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async (args: Record<string, unknown>) => { holder.notifyCalls.push(args) }),
}))
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
  adminNewBookingRequestEmail: (booking: Record<string, unknown>) => {
    holder.adminEmailCalls.push(booking)
    return { subject: 's', html: 'h' }
  },
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

function todayStr(): string {
  return new Date().toLocaleDateString('en-CA')
}

// The admin email/SMS block runs fire-and-forget (`void (async () => {...})()`)
// after the response is returned — give it a tick to run before asserting.
async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

beforeEach(() => {
  holder.bookings.clear()
  holder.selenaConfig = null
  holder.notifyCalls.length = 0
  holder.adminEmailCalls.length = 0
  nycMaidFlag.current = false
})

describe('generic tenant — admin new-booking notifications carry the emergency signal', () => {
  it('a same-day booking prefixes notify() with 🚨 EMERGENCY and marks the email template urgent', async () => {
    holder.selenaConfig = { emergency_available: true, emergency_rate: 120 }
    const res = await bookReq({ start_time: `${todayStr()}T10:00:00`, end_time: `${todayStr()}T12:00:00` })
    expect(res.status).toBe(200)
    await flush()

    expect(holder.notifyCalls[0].title).toBe('🚨 Urgent Booking Request')
    expect(holder.notifyCalls[0].message).toMatch(/^🚨 EMERGENCY — /)
    expect(holder.adminEmailCalls[0].isEmergency).toBe(true)
  })

  it('a routine, future-dated booking is unchanged — no emergency prefix anywhere', async () => {
    const res = await bookReq({})
    expect(res.status).toBe(200)
    await flush()

    expect(holder.notifyCalls[0].title).toBe('New Booking Request')
    expect(holder.notifyCalls[0].message).not.toMatch(/EMERGENCY/)
    expect(holder.adminEmailCalls[0].isEmergency).toBe(false)
  })
})
