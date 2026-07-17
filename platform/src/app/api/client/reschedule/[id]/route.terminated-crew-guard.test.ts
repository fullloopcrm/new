import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * client/reschedule/[id] PUT — terminated-crew guard (P1/W2 fresh-ground).
 *
 * BUG (fixed here): a caller-supplied team_member_id was only checked for
 * tenant ownership, never HR termination. HR termination never touches
 * team_members.status/active (deliberate — see hr.ts's own doc comment), so
 * an authenticated client rescheduling their own booking could reassign it
 * straight to a fired employee. This raw supabaseAdmin update also bypasses
 * PUT /api/bookings/[id]'s own terminated-crew guard entirely, since that
 * guard only runs on that specific route, not this one.
 *
 * FIX: a supplied team_member_id now also runs through
 * getTerminatedTeamMemberIds, right after the existing tenant-ownership check.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: CTX_TENANT, timezone: 'America/New_York', name: 'Acme' })),
}))
vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: vi.fn(async () => ({ clientId: 'client-a' })),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobRescheduled: () => 'msg' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ reschedule: () => 'msg' }) }))

import { PUT } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-1', tenant_id: CTX_TENANT, client_id: 'client-a', team_member_id: null, start_time: '2026-08-01T10:00:00Z', clients: { name: 'Client A' } },
    ],
    team_members: [
      { id: 'tm-terminated', tenant_id: CTX_TENANT },
      { id: 'tm-active', tenant_id: CTX_TENANT },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function req(body: Record<string, unknown>): Request {
  return new Request('http://t/api/client/reschedule/bk-1', { method: 'PUT', body: JSON.stringify(body) })
}
function params() {
  return { params: Promise.resolve({ id: 'bk-1' }) }
}

describe('client/reschedule/[id] PUT — terminated-crew guard', () => {
  it('BLOCKED: reassigning to a terminated team member 400s, no booking update', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z', team_member_id: 'tm-terminated' }), params())
    expect(res.status).toBe(400)
    expect(h.capture.updates.find((u) => u.table === 'bookings')).toBeUndefined()
  })

  it('CONTROL: an active team member still succeeds', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z', team_member_id: 'tm-active' }), params())
    expect(res.status).toBe(200)
    const update = h.capture.updates.find((u) => u.table === 'bookings')
    expect(update?.values.team_member_id).toBe('tm-active')
  })

  it('WRONG-TENANT PROBE: a same-id member terminated only in ANOTHER tenant is not blocked here', async () => {
    h.seed.hr_employee_profiles.push({ id: 'p3', tenant_id: 'tid-OTHER', team_member_id: 'tm-active', hr_status: 'terminated' })
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z', team_member_id: 'tm-active' }), params())
    expect(res.status).toBe(200)
  })
})
