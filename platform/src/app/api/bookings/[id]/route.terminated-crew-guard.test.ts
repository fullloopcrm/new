import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/bookings/[id] — terminated-crew guard (P1/W2 fresh-ground: the
 * job-session routes (86b797ad, f5715d03) gate reassignment on
 * hr_status='terminated', but that guard never extended to this route --
 * the PRIMARY booking-update path every non-project (cleaning-vertical)
 * tenant uses. A let-go team member could be reassigned onto any existing
 * booking with zero warning.
 *
 * FIX: team_member_id now runs through getTerminatedTeamMemberIds
 * immediately after the existing tenant-ownership check, before the update.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return { AuthError, getTenantForRequest: vi.fn() }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => '' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '', reschedule: () => '' }) }))
vi.mock('@/lib/availability', () => ({ checkMemberDayOff: async () => ({ unavailable: false }) }))

import { PUT } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: CTX_TENANT, status: 'draft', client_id: 'client-a', team_member_id: 'tm-active', service_type_id: 'svc-a', start_time: '2026-08-01T10:00:00Z' },
    ],
    clients: [{ id: 'client-a', tenant_id: CTX_TENANT, name: 'A-Client', phone: null }],
    team_members: [
      { id: 'tm-active', tenant_id: CTX_TENANT, name: 'Active Amy', phone: null },
      { id: 'tm-terminated', tenant_id: CTX_TENANT, name: 'Let Go Larry', phone: null },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    service_types: [{ id: 'svc-a', tenant_id: CTX_TENANT, name: 'Alpha Standard Clean' }],
    tenants: [{ id: CTX_TENANT, name: 'Alpha' }],
  }
}

function putReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('bookings/[id] PUT — terminated-crew guard', () => {
  it('BLOCKED: reassigning a terminated team member 400s, booking untouched', async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-terminated' }), ctx('bk-a'))
    expect(res.status).toBe(400)
    const upd = h.capture.updates.find((u) => u.table === 'bookings')
    expect(upd).toBeFalsy()
    expect(h.seed.bookings.find((r) => r.id === 'bk-a')!.team_member_id).toBe('tm-active')
  })

  it('CONTROL: reassigning to an active team member still works', async () => {
    const res = await PUT(putReq({ team_member_id: 'tm-active' }), ctx('bk-a'))
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'bookings')
    expect(upd!.matched[0].team_member_id).toBe('tm-active')
  })
})
