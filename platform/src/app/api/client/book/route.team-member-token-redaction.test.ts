import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/client/book — bookings.team_member_token/token_expires_at
 * redaction probe.
 *
 * BUG (fixed here): this route itself generates a fresh crypto-random token
 * (`generateCleanerToken()`) on every new booking and stores it via
 * `create_booking_atomic`'s `p_team_member_token` param into
 * `bookings.team_member_token` — schema.sql's `worker_token` column comment
 * ("Team member token (for portal access)") describes the same field under
 * its stale pre-rename name. The read-back (`select('*, clients(*),
 * client_properties(*))`) then returned the whole row verbatim
 * (`{ ...data, is_new_client }`) to the caller — the public, unauthenticated
 * booking form. Grepped every read site in the repo: nothing ever validates
 * either name as a credential.
 *
 * FIX: redact `team_member_token`/`worker_token`/`token_expires_at` via
 * omit() before returning. clients.pin is deliberately NOT touched here —
 * that's the established by-design "show a brand-new client their PIN once"
 * echo verified in the prior round; this fix is orthogonal to it.
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

const SECRET_LEGACY_WORKER_TOKEN = 'wtok_legacy_secret_bk1'

const CLIENTS: Record<string, { id: string; tenant_id: string; do_not_service: boolean; name: string; phone: string; email: string; address: string }> = {
  'client-a': { id: 'client-a', tenant_id: 'tid-a', do_not_service: false, name: 'Alice', phone: '111', email: 'alice@a.com', address: '1 A St' },
}

const holder = vi.hoisted(() => ({ bookings: new Map<string, Record<string, unknown>>(), seq: 0, lastGeneratedToken: '' }))

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
    // INSERT column list, which includes team_member_token/token_expires_at
    // (p_team_member_token/p_token_expires_at) — the seed proves the real
    // RPC's write shape, not just a fixture.
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      const id = `bk-${++holder.seq}`
      holder.lastGeneratedToken = args.p_team_member_token as string
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
        team_member_token: args.p_team_member_token,
        worker_token: SECRET_LEGACY_WORKER_TOKEN,
        token_expires_at: args.p_token_expires_at,
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

describe('client/book — team_member_token redaction probe', () => {
  it('never returns bookings.team_member_token (the live, actively-written field)', async () => {
    const res = await bookReq('client-a', '2026-08-02T10:00:00')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.team_member_token).toBeUndefined()
    expect(holder.lastGeneratedToken.length).toBeGreaterThan(0)
    expect(JSON.stringify(body)).not.toContain(holder.lastGeneratedToken)
  })

  it('never returns bookings.worker_token (the stale legacy name, redacted defensively)', async () => {
    const res = await bookReq('client-a', '2026-08-02T10:00:00')
    const body = await res.json()
    expect(body.worker_token).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain(SECRET_LEGACY_WORKER_TOKEN)
  })

  it('never returns bookings.token_expires_at', async () => {
    const res = await bookReq('client-a', '2026-08-02T10:00:00')
    const body = await res.json()
    expect(body.token_expires_at).toBeUndefined()
  })

  it('CONTROL: still returns the fields the booking-confirmation flow needs', async () => {
    const res = await bookReq('client-a', '2026-08-02T10:00:00')
    const body = await res.json()
    expect(body.clients.name).toBe('Alice')
    expect(body.status).toBe('pending')
    expect(holder.bookings.size).toBe(1)
  })
})
