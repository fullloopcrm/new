import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * client/reschedule/[id] PUT — stale pre-existing assignment notify guard
 * (P1/W2 fresh-ground, new trigger class: client-initiated write, not cron).
 *
 * BUG (fixed here): route.terminated-crew-guard.test.ts already covers a
 * caller-supplied team_member_id (a NEW assignment in this same request)
 * being checked against getTerminatedTeamMemberIds. It does NOT cover the far
 * more common case: the client only moves the date/time and never touches
 * team_member_id at all. The booking's EXISTING team_member_id (set before
 * this request, possibly before the worker was ever terminated — HR
 * termination never clears bookings.team_member_id, same root cause as every
 * cron stale-assignment guard this session) was read straight off `updated`
 * and handed to notifyTeamMember() with zero hr_status check, so a client
 * rescheduling their own booking would still trigger a "Job Rescheduled"
 * push/SMS/email to a worker who no longer works there.
 *
 * FIX: the existing team_member_id is now also run through
 * getTerminatedTeamMemberIds right before the notify call, independent of
 * whether this request's body supplied a team_member_id at all.
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
vi.mock('@/lib/notify-team-member', () => ({ notifyTeamMember: vi.fn(async () => ({ memberName: 'x', push: true, email: false, sms: false, inApp: true, quietHours: false })) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobRescheduled: () => 'msg' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ reschedule: () => 'msg' }) }))

import { PUT } from './route'
import { notifyTeamMember } from '@/lib/notify-team-member'

const mockNotifyTeamMember = vi.mocked(notifyTeamMember)

function seed() {
  return {
    bookings: [
      { id: 'bk-terminated', tenant_id: CTX_TENANT, client_id: 'client-a', team_member_id: 'tm-terminated', start_time: '2026-08-01T10:00:00Z', clients: { name: 'Client A' } },
      { id: 'bk-active', tenant_id: CTX_TENANT, client_id: 'client-a', team_member_id: 'tm-active', start_time: '2026-08-01T10:00:00Z', clients: { name: 'Client A' } },
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
  mockNotifyTeamMember.mockClear()
})

function req(body: Record<string, unknown>): Request {
  return new Request('http://t/api/client/reschedule/bk-1', { method: 'PUT', body: JSON.stringify(body) })
}
function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

// Flush the route's fire-and-forget `void (async () => {...})()` fan-out —
// it's never awaited by the handler itself, so a macrotask tick is needed
// after each await chain inside it resolves.
async function flushFanOut() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('client/reschedule/[id] PUT — stale pre-existing assignment notify guard', () => {
  it('SUPPRESSED: date-only reschedule of a booking already stale-assigned to a terminated worker does not notify them', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z' }), params('bk-terminated'))
    expect(res.status).toBe(200)
    await flushFanOut()
    expect(mockNotifyTeamMember).not.toHaveBeenCalled()
  })

  it('CONTROL: date-only reschedule of a booking assigned to an active worker still notifies them', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z' }), params('bk-active'))
    expect(res.status).toBe(200)
    await flushFanOut()
    expect(mockNotifyTeamMember).toHaveBeenCalledTimes(1)
    expect(mockNotifyTeamMember).toHaveBeenCalledWith(expect.objectContaining({ teamMemberId: 'tm-active' }))
  })

  it('WRONG-TENANT PROBE: a same-id member terminated only in ANOTHER tenant is not suppressed here', async () => {
    h.seed.hr_employee_profiles.push({ id: 'p3', tenant_id: 'tid-OTHER', team_member_id: 'tm-active', hr_status: 'terminated' })
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z' }), params('bk-active'))
    expect(res.status).toBe(200)
    await flushFanOut()
    expect(mockNotifyTeamMember).toHaveBeenCalledTimes(1)
    expect(mockNotifyTeamMember).toHaveBeenCalledWith(expect.objectContaining({ teamMemberId: 'tm-active' }))
  })
})
