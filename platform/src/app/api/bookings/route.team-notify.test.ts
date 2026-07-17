import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/bookings — the operator/admin booking-creation route notified a
 * directly-assigned team member with a raw `sendSMS()` call, never routing
 * through `notifyTeamMember()` — the module items (53)/(54)/(56)/(58)/(60)/
 * (62) already established as the one true channel for every other
 * team-member-facing event (push + in-app + quiet-hours + per-type prefs +
 * SMS-consent gate). A push-only tech (no phone, or SMS-consent revoked)
 * assigned to a brand-new booking got zero notice of it, including an
 * emergency one. Proves the fix: notifyTeamMember() is called with the
 * assigned tech's id, type 'job_assignment', and isEmergency mirroring the
 * booking's own is_emergency flag; skipped entirely when no team member is
 * assigned at create time.
 */

const holder = vi.hoisted(() => ({
  notifyTeamMemberCalls: [] as Array<Record<string, unknown>>,
  bookingRow: null as Record<string, unknown> | null,
}))

const TENANT_ID = 'tid-a'
const CLIENT_A = '22222222-2222-2222-2222-222222222222'
const TEAM_A = '33333333-3333-3333-3333-333333333333'
const TENANT = { id: TENANT_ID, name: 'Test Tenant', slug: 't', industry: 'cleaning', phone: null, website_url: null, domain: null, domain_name: null, google_place_id: null, telnyx_api_key: 'key', telnyx_phone: '+15550000000' }

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ require_team_member: false, auto_confirm_bookings: false, default_booking_status: 'scheduled', booking_buffer_minutes: 0 }),
}))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/day-availability', () => ({ slotWithinHours: () => true, hoursWindowForDate: () => null }))
vi.mock('@/lib/cleaner-availability', () => ({ timestampToMin: () => 600 }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({})) }))
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

function createReq(isEmergency: boolean) {
  return POST(
    new Request('http://x/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ client_id: CLIENT_A, team_member_id: TEAM_A, start_time: '2026-08-10T10:00:00.000Z', is_emergency: isEmergency, force: true }),
    }),
  )
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

beforeEach(() => {
  holder.notifyTeamMemberCalls.length = 0
})

describe('POST /api/bookings — team-member job-assignment notification', () => {
  it('routes a routine assignment through notifyTeamMember() with type job_assignment and isEmergency:false', async () => {
    holder.bookingRow = {
      id: 'bk-1',
      team_member_id: TEAM_A,
      start_time: '2026-08-10T10:00:00.000Z',
      is_emergency: false,
      client_id: CLIENT_A,
      clients: { name: 'Alice', phone: '+15551234567', address: null, sms_consent: true },
      team_members: { name: 'Tommy Tech', phone: '+15559876543', pin: '1234' },
    }
    const res = await createReq(false)
    expect(res.status).toBe(201)
    await flush()
    expect(holder.notifyTeamMemberCalls.length).toBe(1)
    const call = holder.notifyTeamMemberCalls[0]
    expect(call.teamMemberId).toBe(TEAM_A)
    expect(call.type).toBe('job_assignment')
    expect(call.isEmergency).toBe(false)
    expect(call.skipEmail).toBe(true)
    expect(call.title).toBe('New Job Assigned')
  })

  it('routes an emergency assignment through notifyTeamMember() with isEmergency:true and the 🚨 title (the quiet-hours push bypass items (53)-(62) established)', async () => {
    holder.bookingRow = {
      id: 'bk-2',
      team_member_id: TEAM_A,
      start_time: '2026-08-10T10:00:00.000Z',
      is_emergency: true,
      client_id: CLIENT_A,
      clients: { name: 'Alice', phone: '+15551234567', address: null, sms_consent: true },
      team_members: { name: 'Tommy Tech', phone: '+15559876543', pin: '1234' },
    }
    const res = await createReq(true)
    expect(res.status).toBe(201)
    await flush()
    expect(holder.notifyTeamMemberCalls.length).toBe(1)
    const call = holder.notifyTeamMemberCalls[0]
    expect(call.isEmergency).toBe(true)
    expect(call.title).toBe('🚨 New Emergency Job Assigned')
  })

  it('skips notifyTeamMember() entirely when no team member is assigned at create time (no crash, no phantom call)', async () => {
    holder.bookingRow = {
      id: 'bk-3',
      team_member_id: null,
      start_time: '2026-08-10T10:00:00.000Z',
      is_emergency: false,
      client_id: CLIENT_A,
      clients: { name: 'Alice', phone: '+15551234567', address: null, sms_consent: true },
      team_members: null,
    }
    const res = await createReq(false)
    expect(res.status).toBe(201)
    await flush()
    expect(holder.notifyTeamMemberCalls.length).toBe(0)
  })
})
