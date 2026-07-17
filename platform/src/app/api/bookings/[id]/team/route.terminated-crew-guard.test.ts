import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/bookings/[id]/team — terminated-crew guard (P1/W2 fresh-ground:
 * the job-session routes (86b797ad, f5715d03) gate reassignment on
 * hr_status='terminated', but that guard never extended to this route --
 * the multi-tech team-assignment surface for the PRIMARY (non-project)
 * booking flow every cleaning-vertical tenant uses. A let-go team member
 * could be put back on a job as lead or extra via this endpoint with zero
 * warning.
 *
 * FIX: requestedIds (lead + extras) now run through
 * getTerminatedTeamMemberIds before anything is written.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/notify-team', () => ({
  notifyTeamMember: vi.fn(async () => ({ teamMemberName: 'x' })),
  formatDeliveryReport: vi.fn(() => 'ok'),
}))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: vi.fn(() => 'msg') }))

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
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

import { PUT } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: A, team_member_id: 'tm-active', team_size: 1, start_time: '2026-08-01T10:00:00Z', clients: { name: 'Client A' } },
    ],
    team_members: [
      { id: 'tm-terminated', tenant_id: A, name: 'Let Go Larry' },
      { id: 'tm-active', tenant_id: A, name: 'Active Amy' },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: A, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: A, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    booking_team_members: [] as Record<string, unknown>[],
  }
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}
function putReq(body: Record<string, unknown>): Request {
  return new Request('http://t/api/bookings/bk-a/team', { method: 'PUT', body: JSON.stringify(body) })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('bookings/[id]/team PUT — terminated-crew guard', () => {
  it('BLOCKED: a terminated team member as lead 400s, no write happens', async () => {
    const res = await PUT(putReq({ lead_id: 'tm-terminated', extra_team_member_ids: [], team_size: 1 }), ctx('bk-a'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('tm-terminated')
    expect(h.capture.updates.find((u) => u.table === 'bookings')).toBeUndefined()
    expect(h.capture.inserts.find((i) => i.table === 'booking_team_members')).toBeUndefined()
  })

  it('BLOCKED: a terminated team member buried in extras still blocks the whole request', async () => {
    const res = await PUT(
      putReq({ lead_id: 'tm-active', extra_team_member_ids: ['tm-terminated'], team_size: 2 }),
      ctx('bk-a'),
    )
    expect(res.status).toBe(400)
    expect(h.capture.updates.find((u) => u.table === 'bookings')).toBeUndefined()
  })

  it('CONTROL: an active-only lead/extras selection still succeeds', async () => {
    const res = await PUT(putReq({ lead_id: 'tm-active', extra_team_member_ids: [], team_size: 1 }), ctx('bk-a'))
    expect(res.status).toBe(200)
    const update = h.capture.updates.find((u) => u.table === 'bookings')
    expect(update?.values.team_member_id).toBe('tm-active')
  })
})
