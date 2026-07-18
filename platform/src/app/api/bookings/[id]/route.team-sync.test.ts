/**
 * PUT /api/bookings/[id] -- this is the main single-booking edit endpoint,
 * and it's also the endpoint the dashboard's Check-In (Admin) / Confirm
 * Check Out actions call directly to (re)assign the crew member in the same
 * request. It wrote bookings.team_member_id without ever syncing
 * booking_team_members, unlike every other team_member_id write site (POST
 * /api/bookings, PUT /api/bookings/[id]/team, schedule-issues fix,
 * team-portal/jobs/reassign, recurring-schedules regenerate/exception). GET
 * /api/bookings/:id/team and closeout-summary both source the lead from
 * booking_team_members, not bookings.team_member_id -- a job dispatched or
 * reassigned here showed as unassigned in the admin Team panel, and a
 * multi-tech job already holding booking_team_members rows for its extras
 * would silently drop the lead from closeout-summary's payout attribution
 * entirely.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: vi.fn(async () => ({ unavailable: false })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'assigned' }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '', reschedule: () => '', cancellation: () => '' }),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { PUT } from './route'

const TENANT_ID = 'tenant-A'
const BOOKING_ID = 'book-1'
const LEAD_ID = 'crew-lead-1'
const OTHER_MEMBER_ID = 'crew-lead-2'
const EXTRA_ID = 'crew-extra-1'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  h.store = {
    bookings: [{ id: BOOKING_ID, tenant_id: TENANT_ID, status: 'scheduled', client_id: null, team_member_id: null, start_time: '2026-08-01T09:00:00', notes: '' }],
    tenants: [{ id: TENANT_ID, name: 'Acme', telnyx_api_key: null, telnyx_phone: null }],
    team_members: [
      { id: LEAD_ID, tenant_id: TENANT_ID, name: 'Hector', phone: null, schedule: null },
      { id: OTHER_MEMBER_ID, tenant_id: TENANT_ID, name: 'Kayla', phone: null, schedule: null },
    ],
    booking_team_members: [],
  }
})

describe('PUT /api/bookings/[id] — booking_team_members lead sync', () => {
  it('creates a lead booking_team_members row when dispatching a crew member (e.g. Check-In (Admin))', async () => {
    const res = await PUT(putReq({ status: 'in_progress', team_member_id: LEAD_ID }), params(BOOKING_ID))
    expect(res.status).toBe(200)

    const rows = h.store.booking_team_members.filter((r) => r.booking_id === BOOKING_ID)
    expect(rows.length).toBe(1)
    expect(rows[0].team_member_id).toBe(LEAD_ID)
    expect(rows[0].is_lead).toBe(true)
    expect(rows[0].tenant_id).toBe(TENANT_ID)
  })

  it('moves the lead row when the crew member is reassigned to someone else', async () => {
    h.store.booking_team_members = [{ id: 'btm-1', tenant_id: TENANT_ID, booking_id: BOOKING_ID, team_member_id: LEAD_ID, is_lead: true, position: 1 }]
    h.store.bookings[0].team_member_id = LEAD_ID

    const res = await PUT(putReq({ team_member_id: OTHER_MEMBER_ID }), params(BOOKING_ID))
    expect(res.status).toBe(200)

    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === BOOKING_ID && r.is_lead)
    expect(leadRows.length).toBe(1)
    expect(leadRows[0].team_member_id).toBe(OTHER_MEMBER_ID)
  })

  it('does not drop an existing extra when the lead is unassigned (team_member_id: null)', async () => {
    h.store.booking_team_members = [
      { id: 'btm-1', tenant_id: TENANT_ID, booking_id: BOOKING_ID, team_member_id: LEAD_ID, is_lead: true, position: 1 },
      { id: 'btm-2', tenant_id: TENANT_ID, booking_id: BOOKING_ID, team_member_id: EXTRA_ID, is_lead: false, position: 2 },
    ]
    h.store.bookings[0].team_member_id = LEAD_ID

    const res = await PUT(putReq({ team_member_id: null }), params(BOOKING_ID))
    expect(res.status).toBe(200)

    const rows = h.store.booking_team_members.filter((r) => r.booking_id === BOOKING_ID)
    expect(rows.length).toBe(1)
    expect(rows[0].team_member_id).toBe(EXTRA_ID)
    expect(rows.some((r) => r.is_lead)).toBe(false)
  })

  it('leaves booking_team_members untouched when team_member_id is not part of the update', async () => {
    const res = await PUT(putReq({ notes: 'just a note edit' }), params(BOOKING_ID))
    expect(res.status).toBe(200)
    expect(h.store.booking_team_members.length).toBe(0)
  })
})
