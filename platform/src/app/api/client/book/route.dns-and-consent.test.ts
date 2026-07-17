import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/book — two gaps found in the same fresh-ground audit round that
 * closed payment-processor.ts's/webhooks/stripe.ts's missing sms_consent
 * checks (see deploy-prep/w2-payment-sms-consent-gap-2026-07-17-0404.md's
 * NOTICED list, site #4).
 *
 * BUG 1 (fixed here, the severe one): `do_not_service` was only ever
 * checked for the caller-supplied `body.client_id` path. This public,
 * unauthenticated booking form also lets a caller identify themselves by
 * `body.email`/`body.phone` alone — that path matched an EXISTING client
 * by email or phone but never checked `do_not_service`, so a client the
 * business explicitly banned could bypass the ban entirely just by
 * submitting the form with their known email/phone instead of their id,
 * creating a real booking (not just a stray SMS).
 *
 * BUG 2 (fixed here): the booking-received confirmation SMS fired
 * unconditionally off `data.clients.phone` with no `sms_consent` check at
 * all, unlike every other client SMS site this session's audit has fixed
 * (payment-processor.ts, webhooks/stripe.ts) — a client who replied STOP
 * kept getting texted on every new booking.
 *
 * FIX: the email/phone-match path now re-checks `do_not_service` (403,
 * same message as the client_id path) before any booking work runs; the
 * confirmation SMS now gates on `sms_consent !== false`.
 */

const TENANT = { id: 'tid-a', name: 'Test Tenant', phone: null, resend_api_key: null, telnyx_api_key: 'key', telnyx_phone: '+15550000000', email_from: null, primary_color: null, logo_url: null }

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
const sendSMSMock = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/messaging/client-email', () => ({ bookingReceivedEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ bookingReceived: () => 'sms' }) }))
vi.mock('@/lib/email-templates', () => ({
  adminNewBookingRequestEmail: () => ({ subject: 's', html: 'h' }),
  referralSignupNotifyEmail: () => ({ subject: 's', html: 'h' }),
}))
vi.mock('@/lib/nycmaid/recurring-discount', () => ({ applyRecurringDiscount: (price: number) => price }))

type Client = { id: string; tenant_id: string; do_not_service: boolean; sms_consent: boolean | null; name: string; phone: string; email: string; address: string }

// 4 existing clients, all tenant tid-a. Distinct emails/phones so the
// route's email-then-phone match order can be exercised independently.
const CLIENTS: Record<string, Client> = {
  'client-dns-email': { id: 'client-dns-email', tenant_id: 'tid-a', do_not_service: true, sms_consent: true, name: 'DNS-by-email', phone: '3005551111', email: 'dnsemail@x.com', address: '1 A St' },
  'client-dns-phone': { id: 'client-dns-phone', tenant_id: 'tid-a', do_not_service: true, sms_consent: true, name: 'DNS-by-phone', phone: '3005552222', email: 'unmatched@x.com', address: '2 A St' },
  'client-blocked-sms': { id: 'client-blocked-sms', tenant_id: 'tid-a', do_not_service: false, sms_consent: false, name: 'Blocked SMS', phone: '3005553333', email: 'blockedsms@x.com', address: '3 A St' },
  'client-control': { id: 'client-control', tenant_id: 'tid-a', do_not_service: false, sms_consent: true, name: 'Control', phone: '3005554444', email: 'control@x.com', address: '4 A St' },
}

const holder = vi.hoisted(() => ({ bookings: new Map<string, Record<string, unknown>>(), seq: 0 }))

function clientsBuilder() {
  const filters: Record<string, string> = {}
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: string) => { filters[col] = val; return chain },
    ilike: (col: string, val: string) => { filters[col] = val; return chain },
    maybeSingle: async () => {
      const match = Object.values(CLIENTS).find((c) => {
        if (filters.id !== undefined && c.id !== filters.id) return false
        if (filters.tenant_id !== undefined && c.tenant_id !== filters.tenant_id) return false
        if (filters.email !== undefined && c.email.toLowerCase() !== filters.email.toLowerCase()) return false
        if (filters.phone !== undefined && c.phone !== filters.phone) return false
        return true
      })
      return { data: match || null, error: null }
    },
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
      const client = CLIENTS[b.client_id as string]
      return {
        data: {
          ...b,
          clients: client ? { name: client.name, phone: client.phone, email: client.email, address: client.address, sms_consent: client.sms_consent } : null,
          client_properties: null,
        },
        error: null,
      }
    },
  }
  return chain
}

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

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') return clientsBuilder()
      if (table === 'bookings') return bookingsSelectBuilder()
      return stubChain()
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      const id = `bk-${++holder.seq}`
      const booking = {
        id,
        tenant_id: args.p_tenant_id,
        client_id: args.p_client_id,
        start_time: args.p_start_time,
        end_time: args.p_end_time,
        status: 'pending',
        price: args.p_price,
        hourly_rate: args.p_hourly_rate,
        service_type: args.p_service_type,
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
      body: JSON.stringify({ start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T11:00:00', ...body }),
    }),
  )
}

beforeEach(() => {
  holder.bookings.clear()
  holder.seq = 0
  sendSMSMock.mockClear()
})

describe('client/book — do_not_service bypass via email/phone match (fixed)', () => {
  it('BLOCKED: a do_not_service client matched by email is 403d before any booking is created', async () => {
    const res = await bookReq({ email: 'dnsemail@x.com', phone: '3005551111' })
    expect(res.status).toBe(403)
    expect(holder.bookings.size).toBe(0)
  })

  it('BLOCKED: a do_not_service client matched by phone (email lookup misses) is 403d before any booking is created', async () => {
    const res = await bookReq({ email: 'nomatch@x.com', phone: '3005552222' })
    expect(res.status).toBe(403)
    expect(holder.bookings.size).toBe(0)
  })
})

describe('client/book — sms_consent gate on booking-received confirmation SMS (fixed)', () => {
  it('BLOCKED: sms_consent=false client still gets the booking, but no confirmation SMS is sent', async () => {
    const res = await bookReq({ email: 'blockedsms@x.com', phone: '3005553333' })
    expect(res.status).toBe(200)
    expect(holder.bookings.size).toBe(1)
    // async fan-out is fire-and-forget (`void (async () => {...})()`) — flush microtasks
    await new Promise((r) => setTimeout(r, 0))
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('CONTROL: sms_consent=true client gets the booking AND the confirmation SMS', async () => {
    const res = await bookReq({ email: 'control@x.com', phone: '3005554444' })
    expect(res.status).toBe(200)
    expect(holder.bookings.size).toBe(1)
    await new Promise((r) => setTimeout(r, 0))
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '3005554444' }))
  })
})
