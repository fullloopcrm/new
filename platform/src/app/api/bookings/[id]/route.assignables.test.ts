/**
 * PUT /api/bookings/[id] — assignables allowlist vs. what the admin dashboard
 * actually sends.
 *
 * BookingsAdmin.tsx's manual "Check In (Admin)" / "Check Out" / edit-time
 * buttons PUT `check_in_time` / `check_out_time` directly to this route (the
 * self-service /api/team-portal/checkin+checkout routes are the *other* way
 * these columns get set, but the admin override path only goes through here).
 * Both are real, load-bearing columns — used throughout payroll, earnings,
 * closeout, and the cron reminder/reset jobs — but the PUT allowlist never
 * included them, so `pick()` silently dropped them from every admin
 * check-in/check-out action: the request 200'd, the UI's local state updated
 * optimistically, but nothing persisted. A reload wiped the "checked in" /
 * "checked out" state entirely.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
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

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  h.store = {
    bookings: [{ id: BOOKING_ID, tenant_id: TENANT_ID, status: 'scheduled', client_id: null, team_member_id: null, start_time: '2026-08-01T09:00:00', check_in_time: null, check_out_time: null }],
    tenants: [{ id: TENANT_ID, name: 'Acme', telnyx_api_key: null, telnyx_phone: null }],
  }
})

describe('PUT /api/bookings/[id] — assignables allowlist matches what the admin UI sends', () => {
  it('persists check_in_time (regression: allowlist previously dropped this field entirely)', async () => {
    const res = await PUT(putReq({ status: 'in_progress', check_in_time: '2026-08-01T09:05:00.000Z' }), params(BOOKING_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.booking.check_in_time).toBe('2026-08-01T09:05:00.000Z')
    expect(h.store.bookings[0].check_in_time).toBe('2026-08-01T09:05:00.000Z')
  })

  it('persists check_out_time (regression: allowlist previously dropped this field entirely)', async () => {
    h.store.bookings[0] = { ...h.store.bookings[0], status: 'in_progress', check_in_time: '2026-08-01T09:05:00.000Z' }

    const res = await PUT(putReq({ status: 'completed', check_out_time: '2026-08-01T11:05:00.000Z', actual_hours: 2 }), params(BOOKING_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.booking.check_out_time).toBe('2026-08-01T11:05:00.000Z')
    expect(h.store.bookings[0].check_out_time).toBe('2026-08-01T11:05:00.000Z')
  })

  it('persists video_dispute_hold (regression: the booking detail page dispute-hold toggle PUTs this field directly)', async () => {
    const res = await PUT(putReq({ video_dispute_hold: true }), params(BOOKING_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.booking.video_dispute_hold).toBe(true)
    expect(h.store.bookings[0].video_dispute_hold).toBe(true)
  })
})
