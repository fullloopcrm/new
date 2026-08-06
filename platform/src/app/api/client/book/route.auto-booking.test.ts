import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Auto booking (Bookings page settings toggle, 2026-08-03) — the tenant-level
 * setting that lets a self-service booking skip 'pending' entirely: the
 * top-scored available team member is assigned and the booking goes straight
 * to 'scheduled'.
 *
 * This is the highest-stakes booking-flow change in the app so far (Jeff,
 * 2026-08-03: "this has to be really, really tight... when I turn it off, it
 * has to go off"). Proven directly here, not inferred from reading the code:
 *   - OFF (default): legacy suggested-only behavior is untouched — booking
 *     stays 'pending', team_member_id stays null, no admin auto-assign alert.
 *   - ON + an available scored member: real assignment — team_member_id set,
 *     status flips to 'scheduled', the admin auto-assign notification fires.
 *   - ON but the last-instant conflict recheck finds the member now booked:
 *     falls back to the same suggested-only behavior as OFF, rather than
 *     double-booking someone (see the route's own race-window comment).
 *
 * Comms-channel routing (Telegram-if-configured, else email) for
 * 'auto_booking_assigned' is proven separately in notify.test.ts, which
 * exercises the real notify() dispatcher — this file mocks notify() and only
 * asserts THIS route calls it with the right type/payload when (and only
 * when) a real auto-assignment happens.
 */

const TENANT = {
  id: 'tid-auto', name: 'Test Tenant', phone: null,
  resend_api_key: null, telnyx_api_key: null, telnyx_phone: null,
  email_from: null, primary_color: null, logo_url: null,
}

const CLIENT = { id: 'client-1', tenant_id: TENANT.id, do_not_service: false, name: 'Jane Client', phone: '+15550001111', email: 'jane@example.com', address: '1 Main St' }
const MEMBER = { id: 'member-1', name: 'Sam Tech' }
const MEMBER2 = { id: 'member-2', name: 'Robin Tech' }
const START_TIME = '2026-09-01T10:00:00'
const END_TIME = '2026-09-01T12:00:00'

const state = vi.hoisted(() => ({
  autoBookingEnabled: false,
  score: [] as Array<{ id: string; name: string; score: number; available: boolean; reason: string }>,
  conflictCount: 0,
  updateCalls: [] as Array<Record<string, unknown>>,
  notifyCalls: [] as Array<Record<string, unknown>>,
  teamInsertCalls: [] as Array<Record<string, unknown>>,
  extraNotifyCalls: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => TENANT }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 10 }) }))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ open_365: true, auto_booking_enabled: state.autoBookingEnabled }),
}))
vi.mock('@/lib/smart-schedule', () => ({
  scoreTeamForBooking: async () => state.score,
  pickBestTeam: (scores: Array<{ id: string; available: boolean; score: number }>, teamSize: number) => {
    const available = scores.filter((s) => s.available).sort((a, b) => b.score - a.score)
    const want = Math.max(1, teamSize)
    const team = available.slice(0, want)
    return { lead: team[0] || null, extras: team.slice(1), short: Math.max(0, want - team.length) }
  },
}))
vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async (payload: Record<string, unknown>) => { state.notifyCalls.push(payload); return { success: true } }),
  buildBookingConfirmationEmail: vi.fn(async () => '<p>confirmed</p>'),
}))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: async () => true }))
vi.mock('@/lib/client-contacts', () => ({
  sendClientEmail: vi.fn(async () => ({ sent: 1, skipped: 0 })),
  createPrimaryContact: vi.fn(async () => {}),
}))
vi.mock('@/lib/messaging/team-sms-resolver', () => ({
  teamSmsTemplatesFor: async () => ({ jobAssignment: () => 'job assignment sms' }),
}))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplates: () => ({ bookingReceived: () => 'received sms', bookingConfirmation: () => 'confirmed sms' }),
}))
vi.mock('@/lib/messaging/client-email', () => ({ bookingReceivedEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/email-templates', () => ({
  adminNewBookingRequestEmail: () => ({ subject: 's', html: 'h' }),
  referralSignupNotifyEmail: () => ({ subject: 's', html: 'h' }),
}))
vi.mock('@/lib/nycmaid/recurring-discount', () => ({ applyRecurringDiscount: (price: number) => price }))
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
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/comhub-contact-sync', () => ({ syncComhubContactName: vi.fn(async () => {}) }))
vi.mock('@/lib/notify-team', () => ({
  notifyTeamMember: vi.fn(async (opts: Record<string, unknown>) => {
    state.extraNotifyCalls.push(opts)
    return { teamMemberName: 'Extra', email: false, sms: true, inApp: true, quietHours: false }
  }),
  formatDeliveryReport: () => 'Team member notified: email ✗ sms ✓',
}))

function clientsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: { do_not_service: CLIENT.do_not_service }, error: null }),
  }
  return chain
}

// supabaseAdmin.from('bookings') covers two distinct call shapes from this
// route: the post-claim read-back (.select('*, clients(*), ...').single())
// and the pre-assign conflict recheck (.select('id', {count, head}) ... a
// bare await, no .single()). Distinguished by whether `opts.count` was passed.
function bookingsAdminBuilder() {
  let wantsCount = false
  const chain: Record<string, unknown> = {
    select: (_cols: string, opts?: { count?: string }) => { wantsCount = !!opts?.count; return chain },
    eq: () => chain,
    not: () => chain,
    lt: () => chain,
    gt: () => chain,
    single: async () => ({
      data: {
        id: 'bk-1', tenant_id: TENANT.id, client_id: CLIENT.id,
        start_time: START_TIME, end_time: END_TIME, status: 'pending',
        clients: { name: CLIENT.name, phone: CLIENT.phone, email: CLIENT.email, address: CLIENT.address },
        client_properties: null,
      },
      error: null,
    }),
    then: (resolve: (v: unknown) => unknown) =>
      resolve(wantsCount ? { count: state.conflictCount, data: null, error: null } : { data: null, error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') return clientsBuilder()
      if (table === 'bookings') return bookingsAdminBuilder()
      if (table === 'booking_team_members') {
        const chain: Record<string, unknown> = {
          insert: (rows: Array<Record<string, unknown>>) => { state.teamInsertCalls.push(...rows); return chain },
          then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
        }
        return chain
      }
      const chain: Record<string, unknown> = {
        select: () => chain, insert: () => chain, update: () => chain, eq: () => chain,
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
      }
      return chain
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      return {
        data: {
          created: true,
          booking: {
            id: 'bk-1', tenant_id: args.p_tenant_id, client_id: args.p_client_id,
            start_time: args.p_start_time, end_time: args.p_end_time, status: 'pending',
            price: args.p_price, hourly_rate: args.p_hourly_rate, service_type: args.p_service_type,
          },
        },
        error: null,
      }
    },
  },
}))

// tenantDb('bookings') covers the two assignment-write shapes this route
// makes: a bare .update().eq() (legacy suggested-only path, no .select()) and
// a .update().eq().select().single() (real auto-assignment, needs the
// assigned row back for the notification helper).
vi.mock('@/lib/tenant-db', () => ({
  tenantDb: () => ({
    from: (_table: string) => {
      const chain: Record<string, unknown> = {
        update: (payload: Record<string, unknown>) => { state.updateCalls.push(payload); return chain },
        eq: () => chain,
        select: () => chain,
        single: async () => ({
          data: {
            id: 'bk-1', start_time: START_TIME, end_time: END_TIME, hourly_rate: null,
            clients: { id: CLIENT.id, name: CLIENT.name, phone: CLIENT.phone, email: CLIENT.email, address: CLIENT.address },
            team_members: { name: MEMBER.name, phone: '+15559998888', pin: null },
          },
          error: null,
        }),
        then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
      }
      return chain
    },
  }),
}))

import { POST } from './route'

function bookReq(extra: Record<string, unknown> = {}) {
  return POST(
    new Request('http://t/api/client/book', {
      method: 'POST',
      body: JSON.stringify({ client_id: CLIENT.id, start_time: START_TIME, end_time: END_TIME, ...extra }),
    }),
  )
}

beforeEach(() => {
  state.autoBookingEnabled = false
  state.score = []
  state.conflictCount = 0
  state.updateCalls = []
  state.notifyCalls = []
  state.teamInsertCalls = []
  state.extraNotifyCalls = []
})

describe('client/book — auto-booking toggle OFF (default)', () => {
  it('leaves the legacy suggested-only behavior untouched: booking stays pending, no auto-assign', async () => {
    state.autoBookingEnabled = false
    state.score = [{ id: MEMBER.id, name: MEMBER.name, score: 50, available: true, reason: 'best fit' }]

    const res = await bookReq()
    expect(res.status).toBe(200)

    const suggestUpdate = state.updateCalls.find((c) => c.suggested_team_member_id === MEMBER.id)
    expect(suggestUpdate).toBeDefined()
    expect(suggestUpdate).not.toHaveProperty('status')
    expect(suggestUpdate).not.toHaveProperty('team_member_id')

    expect(state.notifyCalls.some((c) => c.type === 'auto_booking_assigned')).toBe(false)
  })

  it('OFF with an available scored member still never assigns, even though ON would', async () => {
    state.autoBookingEnabled = false
    state.score = [{ id: MEMBER.id, name: MEMBER.name, score: 99, available: true, reason: 'perfect match' }]
    await bookReq()
    const anyAssignment = state.updateCalls.some((c) => c.team_member_id || c.status === 'scheduled')
    expect(anyAssignment).toBe(false)
  })
})

describe('client/book — auto-booking toggle ON', () => {
  it('a real available scored member gets assigned: team_member_id + status scheduled, admin notified', async () => {
    state.autoBookingEnabled = true
    state.score = [{ id: MEMBER.id, name: MEMBER.name, score: 50, available: true, reason: 'best fit' }]
    state.conflictCount = 0

    const res = await bookReq()
    expect(res.status).toBe(200)

    const assignUpdate = state.updateCalls.find((c) => c.team_member_id === MEMBER.id)
    expect(assignUpdate).toBeDefined()
    expect(assignUpdate?.status).toBe('scheduled')

    await vi.waitFor(() => expect(state.notifyCalls.some((c) => c.type === 'auto_booking_assigned')).toBe(true))
    const notifyCall = state.notifyCalls.find((c) => c.type === 'auto_booking_assigned')
    expect(notifyCall?.tenantId).toBe(TENANT.id)
    expect(String(notifyCall?.message)).toMatch(/scheduled/i)
  })

  it('a last-instant conflict at the assigned member falls back to suggested-only, no double-book, no false admin alert', async () => {
    state.autoBookingEnabled = true
    state.score = [{ id: MEMBER.id, name: MEMBER.name, score: 50, available: true, reason: 'best fit' }]
    state.conflictCount = 1 // someone else claimed this member's slot between the score and the write

    const res = await bookReq()
    expect(res.status).toBe(200)

    const assignUpdate = state.updateCalls.find((c) => c.team_member_id === MEMBER.id && c.status === 'scheduled')
    expect(assignUpdate).toBeUndefined()
    const suggestUpdate = state.updateCalls.find((c) => c.suggested_team_member_id === MEMBER.id)
    expect(suggestUpdate).toBeDefined()

    expect(state.notifyCalls.some((c) => c.type === 'auto_booking_assigned')).toBe(false)
  })

  it('no available scored member: same no-op as OFF, nothing to assign', async () => {
    state.autoBookingEnabled = true
    state.score = []

    await bookReq()
    expect(state.updateCalls.length).toBe(0)
    expect(state.notifyCalls.some((c) => c.type === 'auto_booking_assigned')).toBe(false)
  })
})

// Multi-cleaner regression coverage — real incident, 2026-08-06: a NYC Maid
// client booked a team_size:2 job, auto-booking assigned only the lead
// (Cinthya), and the booking sat SCHEDULED (looking fully staffed) with only
// one cleaner for ~2.5 hours until a human noticed and manually added the
// second. Before this fix, this route only ever picked a single `best`
// candidate and never looked at team_size at all.
describe('client/book — auto-booking with team_size > 1 (multi-cleaner)', () => {
  it('team_size 2, two available candidates: both are assigned, booking_team_members gets lead+extra, extra is notified', async () => {
    state.autoBookingEnabled = true
    state.score = [
      { id: MEMBER.id, name: MEMBER.name, score: 90, available: true, reason: 'best fit' },
      { id: MEMBER2.id, name: MEMBER2.name, score: 80, available: true, reason: 'next best' },
    ]
    state.conflictCount = 0

    const res = await bookReq({ team_size: 2 })
    expect(res.status).toBe(200)

    const assignUpdate = state.updateCalls.find((c) => c.team_member_id === MEMBER.id)
    expect(assignUpdate?.status).toBe('scheduled')

    expect(state.teamInsertCalls).toEqual([
      expect.objectContaining({ team_member_id: MEMBER.id, is_lead: true, position: 1 }),
      expect.objectContaining({ team_member_id: MEMBER2.id, is_lead: false, position: 2 }),
    ])

    await vi.waitFor(() => expect(state.extraNotifyCalls.length).toBe(1))
    expect(state.extraNotifyCalls[0]?.teamMemberId).toBe(MEMBER2.id)

    await vi.waitFor(() => expect(state.notifyCalls.some((c) => c.type === 'auto_booking_assigned')).toBe(true))
    const notifyCall = state.notifyCalls.find((c) => c.type === 'auto_booking_assigned')
    expect(String(notifyCall?.message)).toMatch(/team of 2 fully assigned/i)
    expect(String(notifyCall?.message)).not.toMatch(/short-staffed/i)
  })

  it('team_size 4 with only 2 available candidates: assigns the 2 available and flags the booking SHORT-STAFFED instead of claiming success', async () => {
    state.autoBookingEnabled = true
    state.score = [
      { id: MEMBER.id, name: MEMBER.name, score: 90, available: true, reason: 'best fit' },
      { id: MEMBER2.id, name: MEMBER2.name, score: 80, available: true, reason: 'next best' },
    ]
    state.conflictCount = 0

    const res = await bookReq({ team_size: 4 })
    expect(res.status).toBe(200)

    expect(state.teamInsertCalls.length).toBe(2)

    await vi.waitFor(() => expect(state.notifyCalls.some((c) => c.type === 'auto_booking_assigned')).toBe(true))
    const notifyCall = state.notifyCalls.find((c) => c.type === 'auto_booking_assigned')
    expect(notifyCall?.title).toMatch(/short-staffed/i)
    expect(String(notifyCall?.message)).toMatch(/only 2 of 4 needed cleaners/i)
  })
})
