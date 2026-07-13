import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PARITY-DIFF (W4, FUNNEL lane): `POST /api/client/book` parsed `time` via a
 * fixed lookup map covering only 9am-4pm (client/book/route.ts). Any slot
 * outside that range — e.g. the 8:00 AM / 5:00 PM / 6:00 PM slots the NYC Maid
 * booking form (site/nycmaid/book/new/page.tsx TIME_SLOTS) actually offers —
 * silently fell back to 9am, so a client picking 8:00 AM got booked for 9:00 AM
 * with no error. nycmaid's own standalone build (src/app/api/client/book/route.ts)
 * had already hit and fixed this exact bug with a permissive "H:MM AM/PM" regex
 * parser; this test locks in the ported fix. Not tenant-gated — the parser is
 * shared code, so the fix benefits every tenant's booking form, not just NYC Maid.
 *
 * Mocking follows the route.trade-neutral.test.ts convention.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const CLIENT = '11111111-1111-1111-1111-111111111111'
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

type Row = Record<string, unknown>
const inserts: Array<{ table: string; payload: Row }> = []

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row = {}
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row) => { kind = 'insert'; payload = p; inserts.push({ table, payload: p }); return c },
      update: (p: Row) => { kind = 'update'; void p; return c },
      eq: () => c,
      in: () => c,
      not: () => c,
      is: () => c,
      ilike: () => c,
      gte: () => c,
      lte: () => c,
      order: () => c,
      limit: () => c,
      single: async () => {
        if (kind === 'insert' && table === 'bookings') {
          return {
            data: {
              id: BOOKING_ID,
              ...payload,
              created_at: '2026-08-14T10:00:00Z',
              clients: { name: 'Canary Client', email: null, phone: null, address: null },
              client_properties: null,
            },
            error: null,
          }
        }
        if (table === 'clients') return { data: { do_not_service: false }, error: null }
        return { data: null, error: null }
      },
      maybeSingle: async () => ({ data: null, error: null }),
      then: (res: (v: { data: unknown; error: unknown; count: number }) => unknown) =>
        res({ data: [], error: null, count: 0 }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({
    id: TENANT, name: 'Canary', phone: '', slug: 'canary',
    resend_api_key: null, telnyx_api_key: null, telnyx_phone: null,
    primary_color: null, logo_url: null, email_from: null,
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

describe('POST /api/client/book — time-slot parsing (parity fix vs nycmaid 1:1 hour bug)', () => {
  beforeEach(() => {
    inserts.length = 0
  })

  it.each([
    ['8:00 AM', '08:00:00'],
    ['9:00 AM', '09:00:00'],
    ['12:00 PM', '12:00:00'],
    ['5:00 PM', '17:00:00'],
    ['6:00 PM', '18:00:00'],
  ])('honors the picked slot %s instead of silently defaulting to 9am', async (time, expectedClock) => {
    await POST(bookRequest({
      client_id: CLIENT, date: '2026-08-14', time,
      estimated_hours: 2, price: 15000, recurring_type: 'none',
    }))
    const b = inserts.find((i) => i.table === 'bookings')?.payload
    expect(b?.start_time).toBe(`2026-08-14T${expectedClock}`)
  })

  it('still defaults to 9am only when the time string is genuinely unparseable', async () => {
    await POST(bookRequest({
      client_id: CLIENT, date: '2026-08-14', time: 'whenever works',
      estimated_hours: 2, price: 15000, recurring_type: 'none',
    }))
    const b = inserts.find((i) => i.table === 'bookings')?.payload
    expect(b?.start_time).toBe('2026-08-14T09:00:00')
  })
})
