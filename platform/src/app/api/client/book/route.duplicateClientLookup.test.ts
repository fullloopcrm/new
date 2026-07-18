import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/book — existing-client dedupe lookup (byEmail / byPhone) used
 * `.maybeSingle()` against clients.email/clients.phone, neither of which
 * has a DB-level uniqueness guarantee (plain indexes only — this codebase
 * has repeatedly needed *_dedup migrations for duplicate rows across
 * multiple tables, so duplicate email/phone is a demonstrated shape, not
 * hypothetical). postgrest-js's `.maybeSingle()` sets `data:null` on a 2+
 * row match using the SAME PGRST116 error code it uses for the 0-row case
 * — unchecked here, so an existing client with a duplicate email/phone row
 * silently failed the "does this client already exist" lookup and fell
 * through to inserting a brand-new duplicate client instead of reusing the
 * match, fragmenting that client's booking/contact history.
 *
 * Fix: limit(2) instead of maybeSingle(), pick the first match
 * deterministically, log if ambiguous — same pattern as this session's
 * portal/auth and webhooks/telnyx duplicate-phone fixes.
 */

const TENANT = { id: 'tenant-a', name: 'Test Tenant', phone: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null }
const DUP_EMAIL = 'shared@example.com'
const DUP_PHONE = '2125551234'

const holder = vi.hoisted(() => ({
  insertedBookings: [] as Array<Record<string, unknown>>,
  insertedClients: [] as Array<Record<string, unknown>>,
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
  resolveProperty: vi.fn(async () => ({ id: 'prop-1', address: '1 Main St', latitude: null, longitude: null })),
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
    order: () => chain,
    limit: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
  }
  return chain
}

// Duplicate clients sharing the same email AND phone — the scenario that
// silently created a fresh duplicate client before the fix.
const DUPLICATE_CLIENTS = [
  { id: 'client-1', tenant_id: TENANT.id, email: DUP_EMAIL, phone: DUP_PHONE, do_not_service: false },
  { id: 'client-2', tenant_id: TENANT.id, email: DUP_EMAIL, phone: DUP_PHONE, do_not_service: false },
]

function clientsChain() {
  let filtered = DUPLICATE_CLIENTS.filter((c) => c.tenant_id === TENANT.id)
  let limitN: number | null = null
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      filtered = filtered.filter((r) => (r as Record<string, unknown>)[col] === val)
      return chain
    },
    ilike: (col: string, val: unknown) => {
      // Test only exercises exact-value ILIKE, not wildcard semantics.
      filtered = filtered.filter((r) => String((r as Record<string, unknown>)[col]).toLowerCase() === String(val).toLowerCase())
      return chain
    },
    order: () => chain,
    limit: (n: number) => {
      limitN = n
      return chain
    },
    insert: (row: Record<string, unknown>) => {
      holder.insertedClients.push(row)
      const created = { id: 'client-newly-created', do_not_service: false, ...row }
      return {
        select: () => ({ single: async () => ({ data: created, error: null }) }),
      }
    },
    maybeSingle: async () => {
      // Faithful to real postgrest-js: a 2+-row match is swallowed as
      // data:null with a PGRST116 error, the SAME shape as the 0-row case —
      // this is the exact bug under test, so the mock must reproduce it,
      // not paper over it by always returning the first row.
      if (filtered.length > 1) {
        return { data: null, error: { message: `Expected 0-1 rows, got ${filtered.length}`, code: 'PGRST116' } }
      }
      return { data: filtered[0] ?? null, error: null }
    },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
      const rows = limitN !== null ? filtered.slice(0, limitN) : filtered
      return Promise.resolve({ data: rows, error: null }).then(res, rej)
    },
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
          client_id: last.client_id,
          price: last.price,
          hourly_rate: last.hourly_rate,
          created_at: new Date().toISOString(),
          service_type: 'Standard Cleaning',
          clients: { name: 'Test Client', phone: DUP_PHONE, email: DUP_EMAIL, address: '1 Main St' },
          client_properties: { id: 'prop-1', address: '1 Main St' },
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
      if (table === 'clients') return clientsChain()
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
        name: 'Test Client',
        address: '1 Main St',
        start_time: '2026-08-01T10:00:00',
        end_time: '2026-08-01T12:00:00',
        ...body,
      }),
    }),
  )
}

beforeEach(() => {
  holder.insertedBookings.length = 0
  holder.insertedClients.length = 0
})

describe('POST /api/client/book — duplicate clients.email/phone rows', () => {
  it('reuses an existing client by email instead of creating a duplicate', async () => {
    const res = await bookReq({ email: DUP_EMAIL })
    const body = await res.json()

    expect(res.status).toBe(200)
    // Before the fix: maybeSingle() errored (swallowed) on the 2-row email
    // match, byEmail resolved to null, and the route fell through to
    // inserting a brand-new duplicate client.
    expect(holder.insertedClients.length).toBe(0)
    expect(['client-1', 'client-2']).toContain(holder.insertedBookings[0]?.client_id)
    void body
  })

  it('reuses an existing client by phone (no email supplied path via byPhone) instead of creating a duplicate', async () => {
    const res = await bookReq({ email: 'nobody-matches@example.com', phone: DUP_PHONE })
    void res
    // byEmail won't match (no client has this email); byPhone must catch it.
    expect(holder.insertedClients.length).toBe(0)
    expect(['client-1', 'client-2']).toContain(holder.insertedBookings[0]?.client_id)
  })
})
