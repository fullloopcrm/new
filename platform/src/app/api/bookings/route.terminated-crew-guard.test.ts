import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/bookings — terminated-crew guard (P1/W2 fresh-ground: the
 * job-session routes (86b797ad, f5715d03) gate assignment on
 * hr_status='terminated', but that guard never extended to this route --
 * the PRIMARY booking-create path every non-project (cleaning-vertical)
 * tenant uses. A let-go team member could be assigned to a brand-new
 * booking with zero warning.
 *
 * FIX: team_member_id now runs through getTerminatedTeamMemberIds
 * immediately after the existing tenant-ownership check, before the
 * scheduling-conflict/daily-cap checks and the insert.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], h: null as null | Harness }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_admin_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      const row = holder.h!.from('bookings').insert({
        tenant_id: args.p_tenant_id,
        client_id: args.p_client_id,
        team_member_id: args.p_team_member_id,
        service_type: args.p_service_type,
        start_time: args.p_start_time,
        end_time: args.p_end_time,
        status: args.p_status,
      })
      const { data } = await row.select().single()
      return { data: { created: true, booking: data }, error: null }
    },
  },
}))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' })),
  }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

vi.mock('@/lib/validate', () => ({
  validate: (body: Record<string, unknown>, schema: Record<string, unknown>) => {
    const data: Record<string, unknown> = {}
    for (const k of Object.keys(schema)) if (body[k] !== undefined) data[k] = body[k]
    return { data, error: null }
  },
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({
    require_team_member: false,
    booking_buffer_minutes: 0,
    auto_confirm_bookings: false,
    default_booking_status: 'scheduled',
  }),
}))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => '' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '' }) }))
vi.mock('@/lib/client-properties', () => ({ applyPropertyToBookingClient: () => {} }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))
vi.mock('@/lib/day-availability', () => ({ slotWithinHours: () => true, hoursWindowForDate: () => null }))
vi.mock('@/lib/cleaner-availability', () => ({ timestampToMin: () => 0 }))
vi.mock('@/lib/schedule/duration-class', () => ({ deriveDurationClass: () => null }))

import { POST } from './route'

function seed() {
  return {
    bookings: [] as Record<string, unknown>[],
    clients: [{ id: 'client-a', tenant_id: CTX_TENANT, name: 'A-Client', phone: null }],
    team_members: [
      { id: 'tm-terminated', tenant_id: CTX_TENANT, name: 'Let Go Larry', schedule: null, max_jobs_per_day: null },
      { id: 'tm-active', tenant_id: CTX_TENANT, name: 'Active Amy', schedule: null, max_jobs_per_day: null },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    tenants: [{ id: CTX_TENANT, name: 'Alpha' }],
  }
}

function postReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.h = h
})

describe('bookings POST — terminated-crew guard', () => {
  it('BLOCKED: assigning a terminated team member 400s, no booking inserted', async () => {
    const res = await POST(
      postReq({ client_id: 'client-a', team_member_id: 'tm-terminated', start_time: '2026-08-01T10:00:00Z' }),
    )
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
  })

  it('CONTROL: assigning an active team member still creates the booking', async () => {
    const res = await POST(
      postReq({ client_id: 'client-a', team_member_id: 'tm-active', start_time: '2026-08-01T10:00:00Z' }),
    )
    expect(res.status).toBe(201)
    const inserted = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(inserted!.rows[0].team_member_id).toBe('tm-active')
  })
})
