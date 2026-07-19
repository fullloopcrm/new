import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/book — nycmaid emergency pricing is SAME-DAY ONLY (nycmaid ref
 * 287c8cc4, "emergency $89/hr rate is same-day only, not under-48hr
 * multi-cleaner", ported P1/W2).
 *
 * BUG this closes: `bkIsEmergency = isSameDay || (isUnder48 && isMultiCleaner)`
 * wrongly billed the $89/hr emergency rate on a 2+ cleaner booking made with
 * less than 48 hours notice even when the booking itself was days away, not
 * today. Multi-cleaner bookings should keep their own 4-hour minimum and
 * lose the self-booking discount regardless of notice — just not trigger
 * the emergency surcharge unless it's also same-day.
 *
 * Harness pattern borrowed from route.dns-and-consent.test.ts (same file,
 * same rpc('create_booking_atomic') mock shape) — here `isNycMaid` is
 * mocked TRUE since this pricing model is nycmaid-tenant-scoped.
 */

const TENANT = { id: 'nycmaid-tid', name: 'NYC Maid', phone: null, resend_api_key: null, telnyx_api_key: 'key', telnyx_phone: '+15550000000', email_from: null, primary_color: null, logo_url: null }

vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => TENANT }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 10 }) }))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({ open_365: true }) }))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: async () => [] }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => true }))
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

const holder = vi.hoisted(() => ({ bookings: new Map<string, Record<string, unknown>>(), seq: 0, lastRpcArgs: null as Record<string, unknown> | null }))

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

function clientsBuilder() {
  let op: 'select' | 'insert' = 'select'
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    ilike: () => chain,
    insert: () => { op = 'insert'; return chain },
    maybeSingle: async () => ({ data: null, error: null }), // no existing client — takes the create-new-client branch
    single: async () => op === 'insert'
      ? { data: { id: 'new-client-1', tenant_id: TENANT.id, do_not_service: false }, error: null }
      : { data: null, error: null },
  }
  return chain
}

function bookingsSelectBuilder() {
  let filterId: string | undefined
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: string) => { if (col === 'id') filterId = val; return chain },
    single: async () => {
      const b = holder.bookings.get(filterId!)
      if (!b) return { data: null, error: { message: 'not found' } }
      return { data: { ...b, clients: { name: 'Client', phone: '3005551111', email: 'c@x.com', address: '1 A St', sms_consent: true }, client_properties: null }, error: null }
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') return clientsBuilder()
      if (table === 'bookings') return bookingsSelectBuilder()
      return stubChain()
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      holder.lastRpcArgs = args
      const id = `bk-${++holder.seq}`
      const booking = { id, tenant_id: args.p_tenant_id, client_id: args.p_client_id, start_time: args.p_start_time, status: 'pending', price: args.p_price, hourly_rate: args.p_hourly_rate }
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
      body: JSON.stringify({ name: 'Test Client', email: 'new@x.com', phone: '3005559999', address: '1 A St', ...body }),
    }),
  )
}

// "Today" in the route's ET-anchored comparison, and a date a few days out —
// both far from any DST edge, safely mid-week.
const TODAY_ET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
function daysFromNowET(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

beforeEach(() => {
  holder.bookings.clear()
  holder.seq = 0
  holder.lastRpcArgs = null
})

describe('client/book — nycmaid emergency pricing is same-day only (fixed)', () => {
  it('FIXED: a multi-cleaner booking 1 day out (under 48hr notice, NOT same-day) bills at the regular rate, not $89/hr', async () => {
    const res = await bookReq({
      start_time: `${daysFromNowET(1)}T10:00:00`, end_time: `${daysFromNowET(1)}T12:00:00`,
      team_size: 2, hourly_rate: 69, estimated_hours: 2,
    })
    expect(res.status).toBe(200)
    expect(holder.lastRpcArgs?.p_is_emergency).toBe(false)
    expect(holder.lastRpcArgs?.p_hourly_rate).toBe(69)
    // Multi-cleaner still gets its own 4-hour minimum: 69 * 4 * 2 team = 55200 cents.
    expect(holder.lastRpcArgs?.p_price).toBe(69 * 4 * 2 * 100)
  })

  it('CONTROL: a same-day multi-cleaner booking DOES bill at $89/hr emergency', async () => {
    const res = await bookReq({
      start_time: `${TODAY_ET}T18:00:00`, end_time: `${TODAY_ET}T20:00:00`,
      team_size: 2, hourly_rate: 69, estimated_hours: 2,
    })
    expect(res.status).toBe(200)
    expect(holder.lastRpcArgs?.p_is_emergency).toBe(true)
    expect(holder.lastRpcArgs?.p_hourly_rate).toBe(89)
  })

  it('CONTROL: a same-day single-cleaner booking still bills at $89/hr emergency', async () => {
    const res = await bookReq({
      start_time: `${TODAY_ET}T18:00:00`, end_time: `${TODAY_ET}T19:00:00`,
      team_size: 1, hourly_rate: 69, estimated_hours: 1,
    })
    expect(res.status).toBe(200)
    expect(holder.lastRpcArgs?.p_is_emergency).toBe(true)
    expect(holder.lastRpcArgs?.p_hourly_rate).toBe(89)
  })

  it('CONTROL: a single-cleaner booking 1 day out is neither emergency-rated nor held to the 4-hour minimum', async () => {
    const res = await bookReq({
      start_time: `${daysFromNowET(1)}T10:00:00`, end_time: `${daysFromNowET(1)}T12:00:00`,
      team_size: 1, hourly_rate: 69, estimated_hours: 2,
    })
    expect(res.status).toBe(200)
    expect(holder.lastRpcArgs?.p_is_emergency).toBe(false)
    expect(holder.lastRpcArgs?.p_hourly_rate).toBe(69)
    expect(holder.lastRpcArgs?.p_price).toBe(69 * 2 * 1 * 100)
  })
})
