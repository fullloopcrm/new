import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

/**
 * Zero prior coverage. The core authorization boundary here is the crew-scope
 * check: a lead/manager may only reassign a job to a member inside their
 * scope (scopedMemberIds), never to an arbitrary team member id. That check
 * is mutation-verified below — stubbing scopedMemberIds to omit the target
 * flips the 403 test; including it lets the reassignment through.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'
const ACTOR = '11111111-0000-0000-0000-000000000001'
const PREV_MEMBER = '22222222-0000-0000-0000-000000000002'
const TARGET = '33333333-0000-0000-0000-000000000003'
const BOOKING = 'bbbbbbbb-0000-0000-0000-00000000000b'

let permError: NextResponse | null = null
let scope: string[] = [ACTOR, TARGET, PREV_MEMBER]
let bookingResult: unknown = {
  id: BOOKING,
  team_member_id: PREV_MEMBER,
  start_time: '2026-01-01T10:00:00Z',
  clients: { name: 'Alice Client' },
}
let targetResult: unknown = { pay_rate: 25 }
let updateResult: unknown = { id: BOOKING, team_member_id: TARGET, status: 'confirmed' }
let updateError: unknown = null

const auditCalls: unknown[] = []
const pushCalls: Array<{ memberId: string; title: string }> = []

vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: vi.fn(async () => {
    if (permError) return { auth: null, error: permError }
    return { auth: { id: ACTOR, tid: TENANT, role: 'lead' }, error: null }
  }),
  scopedMemberIds: vi.fn(async () => scope),
}))

vi.mock('@/lib/push', () => ({
  sendPushToTeamMember: vi.fn(async (memberId: string, title: string) => {
    pushCalls.push({ memberId, title })
  }),
}))

vi.mock('@/lib/audit', () => ({
  audit: vi.fn(async (entry: unknown) => {
    auditCalls.push(entry)
  }),
}))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const c: Record<string, unknown> = {
      select: () => c,
      update: () => c,
      eq: () => c,
      maybeSingle: async () => ({ data: updateResult, error: updateError }),
      single: async () => {
        if (table === 'bookings') return { data: bookingResult, error: null }
        if (table === 'team_members') return { data: targetResult, error: null }
        return { data: null, error: null }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

import { POST } from './route'

beforeEach(() => {
  permError = null
  scope = [ACTOR, TARGET, PREV_MEMBER]
  bookingResult = {
    id: BOOKING,
    team_member_id: PREV_MEMBER,
    start_time: '2026-01-01T10:00:00Z',
    clients: { name: 'Alice Client' },
  }
  targetResult = { pay_rate: 25 }
  updateResult = { id: BOOKING, team_member_id: TARGET, status: 'confirmed' }
  updateError = null
  auditCalls.length = 0
  pushCalls.length = 0
})

function req(body: Record<string, unknown>) {
  return new Request('https://x/api/team-portal/jobs/reassign', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('team-portal/jobs/reassign', () => {
  it('propagates the permission-gate error (e.g. 403 for a worker without jobs.reassign)', async () => {
    permError = NextResponse.json({ error: 'Forbidden: your role cannot do this' }, { status: 403 })
    const res = await POST(req({ booking_id: BOOKING, to_member_id: TARGET }))
    expect(res.status).toBe(403)
    expect(auditCalls).toHaveLength(0)
  })

  it('REJECTS (400) missing booking_id or to_member_id', async () => {
    const res = await POST(req({ booking_id: BOOKING }))
    expect(res.status).toBe(400)
  })

  it('REJECTS (403) a target OUTSIDE the actor\'s scope — mutation-verified', async () => {
    scope = [ACTOR] // target not in this lead's crew
    const res = await POST(req({ booking_id: BOOKING, to_member_id: TARGET }))
    expect(res.status).toBe(403)
    expect(auditCalls).toHaveLength(0)
    expect(pushCalls).toHaveLength(0)
  })

  it('ALLOWS a target INSIDE the actor\'s scope', async () => {
    scope = [ACTOR, TARGET, PREV_MEMBER]
    const res = await POST(req({ booking_id: BOOKING, to_member_id: TARGET }))
    expect(res.status).toBe(200)
  })

  it('REJECTS (404) when the booking does not exist / wrong tenant', async () => {
    bookingResult = null
    const res = await POST(req({ booking_id: BOOKING, to_member_id: TARGET }))
    expect(res.status).toBe(404)
  })

  it('REJECTS (404) when the target member does not exist', async () => {
    targetResult = null
    const res = await POST(req({ booking_id: BOOKING, to_member_id: TARGET }))
    expect(res.status).toBe(404)
  })

  it('audits the reassignment with the correct from/to and notifies BOTH sides', async () => {
    const res = await POST(req({ booking_id: BOOKING, to_member_id: TARGET }))
    expect(res.status).toBe(200)
    expect(auditCalls).toHaveLength(1)
    const entry = auditCalls[0] as { details: { from: string; to: string; by: string } }
    expect(entry.details.from).toBe(PREV_MEMBER)
    expect(entry.details.to).toBe(TARGET)
    expect(entry.details.by).toBe(ACTOR)
    expect(pushCalls.map((p) => p.memberId).sort()).toEqual([PREV_MEMBER, TARGET].sort())
  })

  it('does NOT double-notify when the job was unassigned (no previous member)', async () => {
    bookingResult = { ...(bookingResult as object), team_member_id: null }
    const res = await POST(req({ booking_id: BOOKING, to_member_id: TARGET }))
    expect(res.status).toBe(200)
    expect(pushCalls).toHaveLength(1)
    expect(pushCalls[0].memberId).toBe(TARGET)
  })

  it('returns 500 and audits nothing when the update itself fails', async () => {
    updateError = { message: 'db error' }
    const res = await POST(req({ booking_id: BOOKING, to_member_id: TARGET }))
    expect(res.status).toBe(500)
    expect(auditCalls).toHaveLength(0)
  })
})
