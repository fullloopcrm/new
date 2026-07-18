/**
 * POST /api/client/book — retry-on-conflict for clients.pin.
 *
 * idx_clients_tenant_pin_unique (2026_07_17_clients_pin_unique.sql) uniquely
 * constrains (tenant_id, pin). Nothing checked for a collision before this
 * insert, so a fresh random PIN colliding with an existing client's failed
 * the public self-service booking funnel outright with a generic 500 — a
 * real customer's booking (and its revenue) lost to an avoidable retry. This
 * verifies the route regenerates and retries instead, same pattern POST
 * /api/invoices uses for invoice_number/public_token collisions, and gives
 * up cleanly (no infinite retry) once MAX_CLIENT_PIN_ATTEMPTS is exhausted.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const TENANT = { id: 'tenant-a', name: 'Test Tenant', phone: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null }

const h = vi.hoisted(() => ({
  insertAttempts: 0,
  collisionsRemaining: 0,
  pinCalls: 0,
}))

function conflictError() {
  return { code: '23505', message: 'duplicate key value violates unique constraint "idx_clients_tenant_pin_unique"' }
}

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
vi.mock('@/lib/client-auth', () => ({
  randomClientPin: vi.fn(() => {
    h.pinCalls++
    return `pin-${h.pinCalls}`
  }),
  MAX_CLIENT_PIN_ATTEMPTS: 5,
}))

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

function clientsChain() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    ilike: () => chain,
    order: () => chain,
    limit: () => chain,
    insert: (row: Record<string, unknown>) => {
      h.insertAttempts++
      return {
        select: () => ({
          single: async () => {
            if (h.collisionsRemaining > 0) {
              h.collisionsRemaining--
              return { data: null, error: conflictError() }
            }
            return { data: { id: 'new-client-1', ...row }, error: null }
          },
        }),
      }
    },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res, rej),
  }
  return chain
}

function bookingsChain() {
  let isInsert = false
  const chain: Record<string, unknown> = {
    insert: (payload: Record<string, unknown>) => {
      isInsert = true
      Object.assign(chain, { _last: payload })
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
      const last = (chain as { _last: Record<string, unknown> })._last
      return {
        data: {
          id: 'bk-1',
          tenant_id: TENANT.id,
          client_id: last.client_id,
          price: last.price,
          hourly_rate: last.hourly_rate,
          created_at: new Date().toISOString(),
          service_type: 'Standard Cleaning',
          clients: { name: 'Test Client', phone: '2125550000', email: 'newcustomer@example.com', address: '1 Main St' },
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
        name: 'New Customer',
        address: '1 Main St',
        start_time: '2026-08-01T10:00:00',
        end_time: '2026-08-01T12:00:00',
        email: 'newcustomer@example.com',
        ...body,
      }),
    }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  h.insertAttempts = 0
  h.collisionsRemaining = 0
  h.pinCalls = 0
})

describe('POST /api/client/book — clients.pin conflict handling', () => {
  it('regenerates and retries when a fresh PIN collides, and the booking still succeeds', async () => {
    h.collisionsRemaining = 2 // first 2 attempts collide, 3rd succeeds

    const res = await bookReq({})
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(h.insertAttempts).toBe(3)
    expect(h.pinCalls).toBe(3)
    void body
  })

  it('gives up after MAX_CLIENT_PIN_ATTEMPTS instead of retrying forever, and surfaces an error', async () => {
    h.collisionsRemaining = 999 // every attempt collides

    const res = await bookReq({})

    expect(res.status).toBe(500)
    expect(h.insertAttempts).toBe(5)
  })
})
