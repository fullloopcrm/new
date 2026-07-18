import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * W4: `POST /api/client/book` is a PUBLIC, unauthenticated endpoint. Its
 * `name`/`notes` fields were previously stored and relayed verbatim with no
 * length cap — for the NYC Maid tenant, an emergency (same-day) booking
 * relays the client name straight into an admin-bound SMS via
 * `nmSmsAdmins()` (the tenant's trusted Telnyx number, no human review).
 * This is the same smsAdmins-relay bug class already fixed on
 * /api/waitlist, /api/lead, /api/ingest/lead, /api/ingest/application, and
 * /api/contact (all capped at 200/2000) — this route was the missed
 * sibling, and it's the actual production booking-widget endpoint, not a
 * secondary intake form. This test proves the cap holds at both write sites:
 * the `clients` row itself, and the emergency SMS payload built from it.
 */

const TENANT = '00000000-0000-0000-0000-000000000001' // NYCMAID_TENANT_ID → emergency-SMS branch
const CLIENT_ID = '11111111-1111-1111-1111-111111111111'
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

type Row = Record<string, unknown>
const inserts: Array<{ table: string; payload: Row }> = []
const smsAdminCalls: string[] = []
let lastClientInsert: Row = {}

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
        if (kind === 'insert' && table === 'clients') {
          lastClientInsert = payload
          return { data: { id: CLIENT_ID, ...payload }, error: null }
        }
        if (kind === 'insert' && table === 'bookings') {
          return {
            data: {
              id: BOOKING_ID,
              ...payload,
              created_at: '2026-08-14T10:00:00Z',
              clients: { id: CLIENT_ID, name: lastClientInsert.name ?? 'Client', email: null, phone: null, address: null },
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
    id: TENANT, name: 'NYC Maid', phone: '', slug: 'nycmaid',
    resend_api_key: null, telnyx_api_key: null, telnyx_phone: null,
    primary_color: null, logo_url: null, email_from: null,
  }),
  tenantSiteUrl: () => 'https://nycmaid.example.com',
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
vi.mock('@/lib/nycmaid/admin-contacts', () => ({
  smsAdmins: async (msg: string) => { smsAdminCalls.push(msg) },
}))

import { POST } from '@/app/api/client/book/route'

function bookRequest(body: Row): Request {
  return new Request('https://nycmaid.example.com/api/client/book', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/client/book — name/notes length cap (smsAdmins-relay class)', () => {
  beforeEach(() => {
    inserts.length = 0
    smsAdminCalls.length = 0
    lastClientInsert = {}
    vi.useFakeTimers()
    // Pin "now" to the same ET calendar day as the booking → isSameDay=true
    // → NYC Maid emergency branch → nmSmsAdmins() fires.
    vi.setSystemTime(new Date('2026-08-14T15:00:00.000Z')) // 11am ET Aug 14
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('caps an oversized name at 200 chars on the clients insert and the emergency admin SMS', async () => {
    const hugeName = 'A'.repeat(50_000)
    const res = await POST(
      bookRequest({
        email: 'guest@example.com',
        name: hugeName,
        address: '123 Main St',
        service_type: 'Standard Cleaning',
        date: '2026-08-14', // same day as pinned "now" → emergency branch
        time: '2:00 PM',
        estimated_hours: 2,
        hourly_rate: 69,
      }),
    )
    expect(res.status).toBe(200)

    const clientInsert = inserts.find((i) => i.table === 'clients')
    expect(clientInsert).toBeDefined()
    expect((clientInsert!.payload.name as string).length).toBe(200)
    expect(clientInsert!.payload.name).toBe('A'.repeat(200))

    // The admin-bound SMS embeds the (now-capped) client name — total message
    // stays bounded instead of ballooning to 50k+ chars of attacker content.
    expect(smsAdminCalls).toHaveLength(1)
    expect(smsAdminCalls[0].length).toBeLessThan(400)
    expect(smsAdminCalls[0]).toContain('A'.repeat(200))
    expect(smsAdminCalls[0]).not.toContain('A'.repeat(201))
  })

  it('caps an oversized notes field at 2000 chars on the bookings insert', async () => {
    const hugeNotes = 'B'.repeat(50_000)
    await POST(
      bookRequest({
        email: 'guest2@example.com',
        name: 'Normal Name',
        notes: hugeNotes,
        address: '123 Main St',
        service_type: 'Standard Cleaning',
        date: '2026-08-14',
        time: '2:00 PM',
        estimated_hours: 2,
        hourly_rate: 69,
      }),
    )

    const bookingInsert = inserts.find((i) => i.table === 'bookings')
    expect(bookingInsert).toBeDefined()
    const notes = bookingInsert!.payload.notes as string
    // Capped base notes (2000) plus the small fixed emergency-branch suffix.
    expect(notes.startsWith('B'.repeat(2000))).toBe(true)
    expect(notes.length).toBeLessThan(2200)
  })
})
