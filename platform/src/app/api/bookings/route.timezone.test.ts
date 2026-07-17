import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/bookings — item (117): the client-confirmation notify() email
 * (title/message) and the team job-assignment notify() message both
 * rendered the booking's start_time with a bare `toLocaleDateString`/
 * `toLocaleTimeString` and no `timeZone` option, so they displayed in the
 * server runtime's default zone (UTC on Vercel) instead of the tenant's own
 * configured zone — even though this same route already SELECTs
 * `tenants.timezone` and item (115) already threads it through the SMS
 * templates dispatched two lines below. Same shape as item (115)'s
 * sms-templates.ts fix, one layer up: the notify()-facing strings, not the
 * SMS body. Proves the fix: a Pacific tenant's confirmation email/team
 * message now renders the PT calendar date/time, not the UTC one.
 */

const holder = vi.hoisted(() => ({
  notifyCalls: [] as Array<Record<string, unknown>>,
  notifyTeamMemberCalls: [] as Array<Record<string, unknown>>,
  bookingRow: null as Record<string, unknown> | null,
}))

const TENANT_ID = 'tid-a'
const CLIENT_A = '22222222-2222-2222-2222-222222222222'
const TEAM_A = '33333333-3333-3333-3333-333333333333'
// Pacific tenant — America/Los_Angeles is UTC-7 in August (PDT).
const TENANT = {
  id: TENANT_ID, name: 'West Coast Co', slug: 't', industry: 'cleaning', phone: null,
  website_url: null, domain: null, domain_name: null, google_place_id: null,
  telnyx_api_key: 'key', telnyx_phone: '+15550000000', timezone: 'America/Los_Angeles',
}

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ require_team_member: false, auto_confirm_bookings: false, default_booking_status: 'scheduled', booking_buffer_minutes: 0 }),
}))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/day-availability', () => ({ slotWithinHours: () => true, hoursWindowForDate: () => null }))
vi.mock('@/lib/cleaner-availability', () => ({ timestampToMin: () => 600 }))
vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async (args: Record<string, unknown>) => { holder.notifyCalls.push(args); return {} }),
}))
vi.mock('@/lib/notify-team-member', () => ({
  notifyTeamMember: vi.fn(async (args: Record<string, unknown>) => {
    holder.notifyTeamMemberCalls.push(args)
    return { memberName: 'Test Tech', push: true, email: false, sms: true, inApp: true, quietHours: false }
  }),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({})) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'sms body' }) }))
vi.mock('@/lib/messaging/team-sms-resolver', () => ({ teamSmsTemplates: () => ({ jobAssignment: () => 'team sms' }) }))
vi.mock('@/lib/client-properties', () => ({ applyPropertyToBookingClient: () => {} }))
vi.mock('@/lib/schedule/duration-class', () => ({ deriveDurationClass: () => null }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => ({})) }))

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    not: () => c,
    lt: () => c,
    gt: () => c,
    gte: () => c,
    lte: () => c,
    in: () => c,
    insert: () => c,
    single: async () => result,
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return chain({ data: TENANT, error: null })
      if (table === 'clients') return chain({ data: { id: CLIENT_A }, error: null })
      if (table === 'team_members') return chain({ data: { id: TEAM_A }, error: null })
      if (table === 'bookings') return chain({ data: holder.bookingRow, error: null })
      return chain({ data: null, error: null })
    },
  },
}))

import { POST } from './route'

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

beforeEach(() => {
  holder.notifyCalls.length = 0
  holder.notifyTeamMemberCalls.length = 0
  // 2026-08-10T02:00:00Z = 2026-08-09 7:00 PM in America/Los_Angeles (PDT) —
  // a different calendar day AND clock time than the raw UTC instant.
  holder.bookingRow = {
    id: 'bk-1',
    team_member_id: TEAM_A,
    start_time: '2026-08-10T02:00:00.000Z',
    is_emergency: false,
    client_id: CLIENT_A,
    clients: { name: 'Alice', phone: '+15551234567', address: null, sms_consent: true },
    team_members: { name: 'Tommy Tech', phone: '+15559876543', pin: '1234' },
  }
})

describe('POST /api/bookings — notify() date/time render in the tenant\'s own timezone', () => {
  it('renders the client confirmation email title/message in the tenant\'s Pacific zone, not raw UTC', async () => {
    const res = await POST(new Request('http://x/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ client_id: CLIENT_A, team_member_id: TEAM_A, start_time: '2026-08-10T02:00:00.000Z', force: true }),
    }))
    expect(res.status).toBe(201)
    await flush()
    const call = holder.notifyCalls.find((c) => c.type === 'booking_confirmed')
    expect(call).toBeTruthy()
    // PT: Sun, Aug 9 at 7:00 PM — NOT the UTC Mon, Aug 10 at 2:00 AM.
    expect(call!.title).toContain('Aug 9')
    expect(call!.title).not.toContain('Aug 10')
    expect(call!.message).toContain('7:00 PM')
    expect(call!.message).not.toContain('2:00 AM')
  })

  it('renders the team job-assignment message in the tenant\'s Pacific zone too', async () => {
    const res = await POST(new Request('http://x/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ client_id: CLIENT_A, team_member_id: TEAM_A, start_time: '2026-08-10T02:00:00.000Z', force: true }),
    }))
    expect(res.status).toBe(201)
    await flush()
    expect(holder.notifyTeamMemberCalls.length).toBe(1)
    const call = holder.notifyTeamMemberCalls[0]
    expect(call.message).toContain('Aug 9')
    expect(call.message).toContain('7:00 PM')
    expect(call.message).not.toContain('Aug 10')
  })
})
