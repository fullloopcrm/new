import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * client/reschedule/[id] — cross-tenant team_member_id regression test.
 *
 * BUG (fixed here): a caller-supplied `team_member_id` in the PUT body was
 * written straight into `bookings.team_member_id` with no check that it
 * belonged to the requesting tenant. `bookings.team_member_id` only
 * REFERENCES team_members(id) — no tenant-scoped composite key — so any
 * tenant's team member id was accepted. An authenticated client could
 * reassign their own booking to ANOTHER tenant's employee.
 *
 * FIX: a supplied team_member_id is now validated against team_members
 * scoped to the resolved tenant before the update runs; a foreign id 400s.
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tid-a', timezone: 'America/New_York', name: 'Acme' })),
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

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    bookings: [
      { id: 'bk-1', tenant_id: 'tid-a', client_id: 'client-a', team_member_id: null, start_time: '2026-08-01T10:00:00Z', clients: { name: 'Client A' } },
    ],
    team_members: [
      { id: 'tm-a1', tenant_id: 'tid-a' },
      { id: 'tm-b1', tenant_id: 'tid-b' },
    ],
  })
  holder.from = h.from
})

function req(body: Record<string, unknown>): Request {
  return new Request('http://t/api/client/reschedule/bk-1', { method: 'PUT', body: JSON.stringify(body) })
}
function params() {
  return { params: Promise.resolve({ id: 'bk-1' }) }
}

describe('client/reschedule/[id] — cross-tenant team_member_id guard', () => {
  it('cross-tenant team_member_id probe: rejects a foreign team member id with 400', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z', team_member_id: 'tm-b1' }), params())
    expect(res.status).toBe(400)
    const update = h.capture.updates.find((u) => u.table === 'bookings')
    expect(update).toBeUndefined()
  })

  it('same-tenant team_member_id succeeds', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z', team_member_id: 'tm-a1' }), params())
    expect(res.status).toBe(200)
    const update = h.capture.updates.find((u) => u.table === 'bookings')
    expect(update?.values.team_member_id).toBe('tm-a1')
  })

  it('omitting team_member_id still reschedules successfully', async () => {
    const res = await PUT(req({ start_time: '2026-08-02T10:00:00Z', end_time: '2026-08-02T12:00:00Z' }), params())
    expect(res.status).toBe(200)
  })
})
