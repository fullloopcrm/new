import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/book — cross-tenant client_id FK injection (wrong-tenant probe).
 *
 * BUG (fixed here): `body.client_id` is caller-supplied on this public,
 * unauthenticated booking form and was only ever used for the do-not-service
 * gate — a `.single()` lookup scoped to the tenant that silently no-ops (no
 * data, no error handled) when the id belongs to ANOTHER tenant or doesn't
 * exist. The route then proceeded to call `create_booking_atomic` with that
 * client_id regardless. The DB function's ownership check is a bare
 * `PERFORM ... FOR UPDATE` — it does not raise when zero rows match — so a
 * foreign client_id sailed straight into the new booking. The booking
 * read-back embeds `clients(*)` unscoped by tenant, so the response leaked
 * the OTHER tenant's client's name/phone/email/address/notes back to the
 * caller, and the confirmation email/SMS a few lines later would be sent to
 * that real (victim) customer, not the attacker.
 *
 * FIX: `body.client_id` is now verified tenant-owned via `.maybeSingle()`
 * before any booking work runs; a miss 404s.
 */

const TENANT = { id: 'tid-a', name: 'Test Tenant', phone: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null }

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

// clients seeded across two tenants — 'client-a' belongs to tid-a (the caller's
// own tenant), 'client-victim' belongs to a DIFFERENT tenant (tid-b).
const CLIENTS: Record<string, { id: string; tenant_id: string; do_not_service: boolean; name: string; phone: string; email: string; address: string }> = {
  'client-a': { id: 'client-a', tenant_id: 'tid-a', do_not_service: false, name: 'Alice', phone: '111', email: 'alice@a.com', address: '1 A St' },
  'client-victim': { id: 'client-victim', tenant_id: 'tid-b', do_not_service: false, name: 'Victim', phone: '999', email: 'victim@b.com', address: '9 B Ave' },
}

const holder = vi.hoisted(() => ({ bookings: new Map<string, Record<string, unknown>>(), seq: 0 }))

function clientsBuilder() {
  let filterId: string | undefined
  let filterTenant: string | undefined
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: string) => {
      if (col === 'id') filterId = val
      if (col === 'tenant_id') filterTenant = val
      return chain
    },
    maybeSingle: async () => {
      const c = filterId ? CLIENTS[filterId] : undefined
      if (!c || (filterTenant && c.tenant_id !== filterTenant)) return { data: null, error: null }
      return { data: { do_not_service: c.do_not_service }, error: null }
    },
    single: async () => {
      const c = filterId ? CLIENTS[filterId] : undefined
      if (!c || (filterTenant && c.tenant_id !== filterTenant)) return { data: null, error: { message: 'not found' } }
      return { data: { do_not_service: c.do_not_service }, error: null }
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
          clients: client ? { name: client.name, phone: client.phone, email: client.email, address: client.address } : null,
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
    // Mirrors migrations/2026_07_13_client_book_dedupe_atomic.sql's real
    // behavior: the ownership PERFORM is a no-op regardless of match, so the
    // RPC itself does NOT reject a foreign client_id — the app-layer check
    // added by this fix is the only thing that can.
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

function bookReq(clientId: string, startTime: string) {
  return POST(
    new Request('http://t/api/client/book', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, start_time: startTime, end_time: startTime }),
    }),
  )
}

beforeEach(() => {
  holder.bookings.clear()
  holder.seq = 0
})

describe('client/book — cross-tenant client_id FK injection fixed', () => {
  it('wrong-tenant probe: a client_id belonging to ANOTHER tenant 404s before any booking is created', async () => {
    const res = await bookReq('client-victim', '2026-08-01T10:00:00')
    expect(res.status).toBe(404)
    expect(holder.bookings.size).toBe(0)
  })

  it('a client_id that does not exist at all also 404s', async () => {
    const res = await bookReq('client-nonexistent', '2026-08-01T10:00:00')
    expect(res.status).toBe(404)
    expect(holder.bookings.size).toBe(0)
  })

  it('CONTROL: an own-tenant client_id still creates the booking and returns that client\'s own data', async () => {
    const res = await bookReq('client-a', '2026-08-02T10:00:00')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.clients.name).toBe('Alice')
    expect(holder.bookings.size).toBe(1)
  })
})
