/**
 * POST /api/bookings -- the main one-off booking-creation route stamped
 * team_member_id on the new booking but never created a matching
 * booking_team_members lead row. GET /api/bookings/:id/team and
 * closeout-summary source the lead from booking_team_members, not
 * bookings.team_member_id -- a booking created here with a real assignee
 * showed as unassigned in the admin Team panel and closeout payout
 * attribution from the moment it was created. Same booking_team_members-sync
 * gap fixed at every other bookings.team_member_id write site this session.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const CLIENT_ID = '11111111-1111-1111-1111-111111111111'
const TEAM_MEMBER_ID = '22222222-2222-2222-2222-222222222222'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getTenantForRequest: vi.fn(),
  requirePermission: vi.fn(),
  getSettings: vi.fn(),
  checkMemberDayOff: vi.fn(),
  slotWithinHours: vi.fn(),
  hoursWindowForDate: vi.fn(),
  notify: vi.fn(),
  sendSMS: vi.fn(),
  audit: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  getTenantForRequest: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  getSettings: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  checkMemberDayOff: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  slotWithinHours: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  hoursWindowForDate: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  notify: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  sendSMS: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  audit: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/settings', () => ({ getSettings: (...a: unknown[]) => h.getSettings(...a) }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: (...a: unknown[]) => h.checkMemberDayOff(...a) }))
vi.mock('@/lib/day-availability', () => ({
  slotWithinHours: (...a: unknown[]) => h.slotWithinHours(...a),
  hoursWindowForDate: (...a: unknown[]) => h.hoursWindowForDate(...a),
}))
vi.mock('@/lib/notify', () => ({ notify: (...a: unknown[]) => h.notify(...a) }))
vi.mock('@/lib/sms', () => ({ sendSMS: (...a: unknown[]) => h.sendSMS(...a) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'team sms body' }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'confirmation sms' }),
}))
vi.mock('@/lib/audit', () => ({ audit: (...a: unknown[]) => h.audit(...a) }))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

const validCreateBody = {
  client_id: CLIENT_ID,
  team_member_id: TEAM_MEMBER_ID,
  start_time: '2026-08-15T09:00:00',
  end_time: '2026-08-15T11:00:00',
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId }))
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.getSettings.mockReset()
  h.getSettings.mockResolvedValue({ booking_buffer_minutes: 0 })
  h.checkMemberDayOff.mockReset()
  h.checkMemberDayOff.mockResolvedValue({ unavailable: false })
  h.slotWithinHours.mockReset()
  h.slotWithinHours.mockReturnValue(true)
  h.hoursWindowForDate.mockReset()
  h.hoursWindowForDate.mockReturnValue(null)
  h.notify.mockReset()
  h.notify.mockResolvedValue({ success: true })
  h.sendSMS.mockReset()
  h.sendSMS.mockResolvedValue({ ok: true })
  h.audit.mockReset()
  h.audit.mockResolvedValue(undefined)
  h.store = {
    bookings: [],
    team_members: [
      { id: TEAM_MEMBER_ID, tenant_id: 'tenant-A', name: 'Carl', phone: null, schedule: null, max_jobs_per_day: null },
    ],
    service_types: [],
    clients: [{ id: CLIENT_ID, tenant_id: 'tenant-A', name: 'Pat', phone: null, sms_consent: true }],
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', telnyx_api_key: null, telnyx_phone: null }],
    booking_team_members: [],
  }
})

describe('POST /api/bookings — booking_team_members lead sync', () => {
  it('creates a lead booking_team_members row when team_member_id is set', async () => {
    const res = await POST(postReq(validCreateBody))
    const json = await res.json()

    expect(res.status).toBe(201)
    const rows = h.store.booking_team_members.filter((r) => r.booking_id === json.booking.id)
    expect(rows.length).toBe(1)
    expect(rows[0].team_member_id).toBe(TEAM_MEMBER_ID)
    expect(rows[0].is_lead).toBe(true)
    expect(rows[0].tenant_id).toBe('tenant-A')
  })

  it('creates no booking_team_members row when no team_member_id is given', async () => {
    const res = await POST(postReq({ client_id: CLIENT_ID, start_time: '2026-08-15T09:00:00', end_time: '2026-08-15T11:00:00' }))

    expect(res.status).toBe(201)
    expect(h.store.booking_team_members.length).toBe(0)
  })
})
