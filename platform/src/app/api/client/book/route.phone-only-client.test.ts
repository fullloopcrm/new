import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/client/book — phone-only client resolution.
 *
 * BUG: the top-level gate accepts client_id OR email OR phone, but the
 * client-resolution block below it only ran `if (!clientId && body.email)`.
 * A phone-only submission (no client_id, no email) passed the gate and then
 * fell straight through client resolution with `clientId` left undefined —
 * producing a clientless booking (`p_client_id: null` in
 * create_booking_atomic) and a clientless mirror `deals` row
 * (`client_id: clientId || null`).
 *
 * FIX: the resolution block now runs for email OR phone, tries a phone
 * match before falling back to create, and a hard guard right after the
 * block rejects the request outright if clientId is still unresolved —
 * so client_id can never reach either insert as null on this path.
 */

const TENANT_A = { id: 'tenant-a', name: 'Tenant A', phone: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null, timezone: 'America/New_York' }

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
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({ open_365: true }) }))

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

const holder = vi.hoisted(() => ({
  existingByPhone: null as { id: string } | null,
  createdClientId: 'new-client-1',
  dealInserts: [] as Record<string, unknown>[],
  rpcCalls: [] as Record<string, unknown>[],
}))

function clientsBuilder() {
  let filterCol: string | undefined
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string) => {
      filterCol = col
      return chain
    },
    ilike: () => chain,
    maybeSingle: async () => {
      if (filterCol === 'phone') return { data: holder.existingByPhone, error: null }
      return { data: null, error: null } // email lookup: never matches in these tests
    },
    insert: () => ({
      select: () => ({
        single: async () => ({ data: { id: holder.createdClientId }, error: null }),
      }),
    }),
  }
  return chain
}

function dealsBuilder() {
  return {
    insert: (row: Record<string, unknown>) => {
      holder.dealInserts.push(row)
      return Promise.resolve({ data: null, error: null })
    },
  }
}

function bookingsBuilder(clientId: string | null) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({
      data: { id: 'bk-1', client_id: clientId, clients: null, client_properties: null },
      error: null,
    }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') return clientsBuilder()
      if (table === 'deals') return dealsBuilder()
      if (table === 'bookings') return bookingsBuilder(holder.rpcCalls.at(-1)?.p_client_id as string | null ?? null)
      return stubChain()
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      holder.rpcCalls.push(args)
      return { data: { created: true, booking: { id: 'bk-1', client_id: args.p_client_id } }, error: null }
    },
  },
}))

import { POST } from './route'

function bookReqPhoneOnly(phone: string) {
  return POST(
    new Request('http://t/api/client/book', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        name: 'Phone Only Caller',
        address: '1 Test St',
        start_time: '2026-07-20T10:00:00',
        end_time: '2026-07-20T12:00:00',
      }),
    }),
  )
}

beforeEach(() => {
  holder.existingByPhone = null
  holder.dealInserts.length = 0
  holder.rpcCalls.length = 0
})

describe('POST /api/client/book — phone-only client resolution', () => {
  it('creates a client and resolves client_id (never null) when no email is given', async () => {
    const res = await bookReqPhoneOnly('5551234567')
    expect(res.status).toBe(200)
    expect(holder.rpcCalls.length).toBe(1)
    expect(holder.rpcCalls[0].p_client_id).toBe('new-client-1')
    expect(holder.dealInserts.length).toBe(1)
    expect(holder.dealInserts[0].client_id).toBe('new-client-1')
    expect(holder.dealInserts[0].client_id).not.toBeNull()
  })

  it('resolves an existing client by phone instead of creating a duplicate', async () => {
    holder.existingByPhone = { id: 'existing-client-9' }
    const res = await bookReqPhoneOnly('5559876543')
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_client_id).toBe('existing-client-9')
    expect(holder.dealInserts[0].client_id).toBe('existing-client-9')
  })

  it('rejects the request outright rather than booking with no client (defense in depth)', async () => {
    // Neither client_id nor email nor phone -- top-level gate rejects before
    // resolution even runs.
    const res = await POST(
      new Request('http://t/api/client/book', {
        method: 'POST',
        body: JSON.stringify({ start_time: '2026-07-20T10:00:00', end_time: '2026-07-20T12:00:00' }),
      }),
    )
    expect(res.status).toBe(400)
    expect(holder.rpcCalls.length).toBe(0)
  })
})
