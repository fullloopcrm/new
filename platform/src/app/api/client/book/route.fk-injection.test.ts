import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/client/book — client_id FK-injection.
 *
 * BUG: the route's only check on a caller-supplied client_id was a
 * do-not-service lookup scoped to `.eq('id', client_id).eq('tenant_id',
 * tenant.id)`. If client_id belonged to a DIFFERENT tenant, that lookup
 * simply returned no row — `dnsCheck?.do_not_service` was `undefined`
 * (falsy), so the gate silently no-opped instead of rejecting. The route
 * then created a real booking with the caller's tenant_id but the victim
 * tenant's client_id, and the booking-fetch immediately after
 * (`.select('*, clients(*), ...')`) joins `clients(*)` off that FK with no
 * further tenant filter — so the victim's full PII (name, phone, email,
 * address) was returned directly in this PUBLIC, unauthenticated endpoint's
 * response. Same FK-injection class already fixed on POST /api/bookings.
 *
 * FIX: `.maybeSingle()` result is now checked for existence — a client_id
 * that doesn't resolve inside the caller's own tenant is rejected with 404
 * before any booking is created.
 */

const TENANT_A = { id: 'tenant-a', name: 'Tenant A', phone: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null }

const holder = vi.hoisted(() => ({
  clients: new Map<string, { id: string; tenant_id: string; do_not_service: boolean }>([
    ['client-a', { id: 'client-a', tenant_id: 'tenant-a', do_not_service: false }],
    ['client-b-victim', { id: 'client-b-victim', tenant_id: 'tenant-b', do_not_service: false }],
  ]),
  rpcCalls: [] as Record<string, unknown>[],
}))

vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => TENANT_A }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 10 }) }))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: async () => [] }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
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
    ilike: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
  }
  return chain
}

function clientsSelectBuilder() {
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
      const c = holder.clients.get(filterId!)
      if (!c || c.tenant_id !== filterTenant) return { data: null, error: null }
      return { data: { do_not_service: c.do_not_service }, error: null }
    },
    single: async () => {
      const c = holder.clients.get(filterId!)
      if (!c || c.tenant_id !== filterTenant) return { data: null, error: { message: 'not found' } }
      return { data: { do_not_service: c.do_not_service }, error: null }
    },
  }
  return chain
}

function bookingsSelectBuilder(bookingCreated: { id: string; client_id: string } | null) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    single: async () => {
      if (!bookingCreated) return { data: null, error: { message: 'not found' } }
      return {
        data: {
          ...bookingCreated,
          clients: { name: 'Victim Client', phone: '555-0000', email: 'victim@example.com', address: '1 Secret St' },
          client_properties: null,
        },
        error: null,
      }
    },
  }
  return chain
}

const state = vi.hoisted(() => ({ lastBooking: null as { id: string; client_id: string } | null }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') return clientsSelectBuilder()
      if (table === 'bookings') return bookingsSelectBuilder(state.lastBooking)
      return stubChain()
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      holder.rpcCalls.push(args)
      const booking = { id: 'bk-1', client_id: args.p_client_id as string }
      state.lastBooking = booking
      return { data: { created: true, booking }, error: null }
    },
  },
}))

import { POST } from './route'

function bookReq(clientId: string) {
  return POST(
    new Request('http://t/api/client/book', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, start_time: '2026-07-20T10:00:00', end_time: '2026-07-20T12:00:00' }),
    }),
  )
}

beforeEach(() => {
  holder.rpcCalls.length = 0
  state.lastBooking = null
})

describe('POST /api/client/book — client_id ownership verified before booking', () => {
  it('rejects a client_id belonging to a DIFFERENT tenant, before any booking is created', async () => {
    const res = await bookReq('client-b-victim')
    expect(res.status).toBe(404)
    expect(holder.rpcCalls.length).toBe(0)
  })

  it('does not leak the foreign client PII in the response', async () => {
    const res = await bookReq('client-b-victim')
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain('Victim Client')
    expect(JSON.stringify(body)).not.toContain('victim@example.com')
  })

  it('positive control: a client_id owned by the caller tenant still succeeds', async () => {
    const res = await bookReq('client-a')
    expect(res.status).toBe(200)
    expect(holder.rpcCalls.length).toBe(1)
    expect(holder.rpcCalls[0].p_client_id).toBe('client-a')
  })
})
