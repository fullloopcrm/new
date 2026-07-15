import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 file-only fix verification: `POST /api/client/book` used to fall back to the
 * hardcoded cleaning term 'Standard Cleaning' whenever a booking omitted
 * service_type (client/book/route.ts:252). That leaks maid-specific vocabulary
 * into every non-cleaning tenant's booking record. The fix derives the fallback
 * from the tenant's own industry preset (src/lib/industry-presets.ts) instead.
 *
 * Mocking follows the same convention as route.happy-path.test.ts.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const CLIENT = '11111111-1111-1111-1111-111111111111'
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

type Row = Record<string, unknown>
const inserts: Array<{ table: string; payload: Row }> = []
let tenantIndustry: string | null = null
let lastBooking: Row | null = null

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row = {}
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row) => { kind = 'insert'; payload = p; inserts.push({ table, payload: p }); return c },
      update: (p: Row) => { kind = 'update'; void p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      in: () => c,
      not: () => c,
      is: () => c,
      ilike: () => c,
      gte: () => c,
      lte: () => c,
      order: () => c,
      limit: () => c,
      single: async () => {
        // Booking creation runs inside create_booking_atomic (see the rpc()
        // mock below); this is the route's plain SELECT read-back of the
        // row the RPC just created.
        if (table === 'bookings' && lastBooking && eqs.id === lastBooking.id) {
          return { data: lastBooking, error: null }
        }
        if (table === 'clients') return { data: { do_not_service: false }, error: null }
        return { data: null, error: null }
      },
      maybeSingle: async () => {
        if (table === 'clients') return { data: { do_not_service: false }, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown; count: number }) => unknown) =>
        res({ data: [], error: null, count: 0 }),
    }
    return c
  }
  return {
    supabaseAdmin: {
      from: (t: string) => chain(t),
      // Booking creation now runs atomically inside create_booking_atomic
      // (migrations/2026_07_13_client_book_dedupe_atomic.sql) — record the
      // insert payload the same way the old direct .insert() did, so this
      // file's assertions against `inserts` still hold.
      rpc: async (fn: string, args: Row) => {
        if (fn !== 'create_booking_atomic') return { data: null, error: { message: `unmocked rpc ${fn}` } }
        const payload: Row = {
          tenant_id: args.p_tenant_id,
          client_id: args.p_client_id,
          start_time: args.p_start_time,
          end_time: args.p_end_time,
          service_type: args.p_service_type,
          price: args.p_price,
          hourly_rate: args.p_hourly_rate,
          status: 'pending',
        }
        inserts.push({ table: 'bookings', payload })
        lastBooking = {
          id: BOOKING_ID,
          ...payload,
          created_at: '2026-08-14T10:00:00Z',
          clients: { name: 'Canary Client', email: null, phone: null, address: null },
          client_properties: null,
        }
        return { data: { created: true, booking: { id: BOOKING_ID } }, error: null }
      },
    },
  }
})

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({
    id: TENANT, name: 'Canary', phone: '', slug: 'canary',
    resend_api_key: null, telnyx_api_key: null, telnyx_phone: null,
    primary_color: null, logo_url: null, email_from: null,
    industry: tenantIndustry,
  }),
  tenantSiteUrl: () => 'https://canary.example.com',
}))

vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))
vi.mock('@/lib/holidays', () => ({ isHoliday: () => null }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({ success: true }) }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => ({}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: async () => {} }))
vi.mock('@/lib/email-templates', () => ({
  adminNewBookingRequestEmail: () => ({ subject: '', html: '' }),
  referralSignupNotifyEmail: () => ({ subject: '', html: '' }),
}))
vi.mock('@/lib/messaging/client-email', () => ({ bookingReceivedEmail: () => ({ subject: '', html: '' }) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ bookingReceived: () => '' }) }))
vi.mock('@/lib/attribution', () => ({ autoAttributeBooking: async () => {} }))
vi.mock('@/lib/client-properties', () => ({
  resolveProperty: async () => null,
  applyPropertyToBookingClient: () => {},
}))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: async () => [] }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: async () => {} }))

import { POST } from '@/app/api/client/book/route'

function bookRequest(body: Row): Request {
  return new Request('https://canary.example.com/api/client/book', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/client/book — trade-neutral service_type fallback', () => {
  beforeEach(() => {
    inserts.length = 0
    tenantIndustry = null
    lastBooking = null
  })

  it('defaults a plumbing tenant to its own preset, never the cleaning term', async () => {
    tenantIndustry = 'plumbing'
    await POST(bookRequest({
      client_id: CLIENT, date: '2026-08-14', time: '10:00 AM',
      estimated_hours: 2, price: 15000, recurring_type: 'none',
    }))
    const b = inserts.find((i) => i.table === 'bookings')?.payload
    expect(b?.service_type).toBe('Service Call')
    expect(b?.service_type).not.toMatch(/clean/i)
  })

  it('defaults an unknown/missing industry to the generic preset, not a cleaning term', async () => {
    tenantIndustry = null
    await POST(bookRequest({
      client_id: CLIENT, date: '2026-08-14', time: '10:00 AM',
      estimated_hours: 2, price: 15000, recurring_type: 'none',
    }))
    const b = inserts.find((i) => i.table === 'bookings')?.payload
    expect(b?.service_type).toBe('Service Call')
    expect(b?.service_type).not.toMatch(/clean/i)
  })

  it('still respects an explicit service_type when the caller supplies one', async () => {
    tenantIndustry = 'plumbing'
    await POST(bookRequest({
      client_id: CLIENT, date: '2026-08-14', time: '10:00 AM',
      estimated_hours: 2, price: 15000, recurring_type: 'none',
      service_type: 'Custom Job',
    }))
    const b = inserts.find((i) => i.table === 'bookings')?.payload
    expect(b?.service_type).toBe('Custom Job')
  })
})
