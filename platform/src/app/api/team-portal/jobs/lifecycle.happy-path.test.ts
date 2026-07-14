import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 team-portal JOB LIFECYCLE happy-path lock (gap #6 from e2e-flow-coverage.md
 * §6: portal ACTIONS — `jobs/claim` → `release` → `reassign` state transitions —
 * had no functional test; only the auth gate around them was covered, and
 * nothing asserted a claimed job flips state or can't be double-claimed).
 *
 * This drives the whole state machine end-to-end against a stateful DB mock that
 * tracks the booking's current assignee, so each transition's effect is real:
 *
 *   claim    open (team_member_id NULL) → confirmed, held by claimer, pay stamped
 *   claim×2  the same job is already taken → 409, holder unchanged (atomic
 *            first-writer-wins via the `team_member_id IS NULL` UPDATE filter)
 *   reassign holder → new member, status confirmed, pay re-stamped from target
 *   release  holder hands it back → team_member_id NULL, status scheduled
 *
 * Plus the two state guards on the write path: a member cannot release a job they
 * do not hold (403), and a claim is refused at the daily job cap (409).
 *
 * WHAT IS REAL vs MOCKED
 * ----------------------
 * REAL: the route decision logic itself (which filters/state each transition
 * writes, the cap check, first-writer-wins semantics).
 * MOCKED: `requirePortalPermission` / `scopedMemberIds` (the AUTH boundary — it
 * is the single strongest-covered area, exhaustively fenced by the isolation
 * suite; mocking it here keeps the focus on the STATE machine, which is the gap),
 * the DB (stateful chainable builder tracking the live assignee), audit, push.
 */

type Row = Record<string, unknown>

// Live booking assignee — the state the transitions mutate. null = open pool.
let jobAssignee: string | null = null
// What the daily-cap count query reports (claim route's hoarding guard).
let claimCount = 0
// team_members rows the routes read for pay_rate / cap.
let members: Record<string, { pay_rate: number; max_jobs_per_day?: number | null } | undefined> = {}
// The authenticated caller for the current POST (varies per lifecycle step).
let currentAuth = { id: 'm-1', tid: 't-1', role: 'worker' }
// Who the actor is allowed to reassign to.
let scope: string[] = ['m-1', 'm-2']

vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () => ({ auth: currentAuth, error: null }),
  scopedMemberIds: async () => scope,
}))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/push', () => ({ sendPushToTeamMember: async () => {} }))

vi.mock('@/lib/supabase', () => {
  function builder(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'update' = 'read'
    let isNullCol: string | null = null
    let payload: Row = {}
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      is: (col: string) => { isNullCol = col; return c },
      not: () => c,
      gte: () => c,
      lt: () => c,
      single: async () => {
        if (table === 'team_members') return { data: members[eqs.id as string] ?? null, error: null }
        if (table === 'bookings') {
          // reassign's current-holder fetch
          return {
            data: { id: eqs.id, team_member_id: jobAssignee, start_time: '2026-08-20T14:00:00Z', clients: { name: 'Client' } },
            error: null,
          }
        }
        return { data: null, error: null }
      },
      maybeSingle: async () => {
        if (table === 'bookings' && kind === 'update') {
          if (isNullCol === 'team_member_id') {
            // CLAIM — atomic first-writer-wins on `team_member_id IS NULL`.
            if (jobAssignee === null) {
              jobAssignee = payload.team_member_id as string | null
              return { data: { id: eqs.id, ...payload }, error: null }
            }
            return { data: null, error: null } // already taken
          }
          if ('team_member_id' in eqs) {
            // RELEASE — only the current holder can hand it back.
            if (jobAssignee === eqs.team_member_id) {
              jobAssignee = payload.team_member_id as string | null
              return { data: { id: eqs.id, ...payload }, error: null }
            }
            return { data: null, error: null } // not your job
          }
          // REASSIGN — plain tenant-scoped update.
          jobAssignee = payload.team_member_id as string | null
          return { data: { id: eqs.id, ...payload }, error: null }
        }
        return { data: null, error: null }
      },
      then: (res: (v: { data?: unknown; error: unknown; count?: number }) => unknown) => {
        // claim's daily-cap count query
        if (table === 'bookings') return res({ count: claimCount, data: [], error: null })
        return res({ data: [], error: null, count: 0 })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => builder(t) } }
})

import { POST as claim } from './claim/route'
import { POST as reassign } from './reassign/route'
import { POST as release } from './release/route'

function req(body: Row): Request {
  return new Request('http://localhost/api/team-portal/jobs', {
    method: 'POST',
    headers: { authorization: 'Bearer tok', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jobAssignee = null
  claimCount = 0
  members = { 'm-1': { pay_rate: 25, max_jobs_per_day: null }, 'm-2': { pay_rate: 30, max_jobs_per_day: null } }
  currentAuth = { id: 'm-1', tid: 't-1', role: 'worker' }
  scope = ['m-1', 'm-2']
})

describe('team-portal job lifecycle — claim → double-claim → reassign → release (gap #6)', () => {
  it('drives each transition to the correct state', async () => {
    // 1. Worker m-1 claims an OPEN job → confirmed, held by m-1, pay stamped.
    currentAuth = { id: 'm-1', tid: 't-1', role: 'worker' }
    let res = await claim(req({ booking_id: 'b-1' }))
    expect(res.status).toBe(200)
    let body = (await res.json()) as { booking: Row }
    expect(body.booking.team_member_id).toBe('m-1')
    expect(body.booking.status).toBe('confirmed') // open → confirmed
    expect(body.booking.pay_rate).toBe(25) // stamped from the claiming member

    // 2. Worker m-2 tries to claim the SAME job → already taken, holder unchanged.
    currentAuth = { id: 'm-2', tid: 't-1', role: 'worker' }
    res = await claim(req({ booking_id: 'b-1' }))
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: string }).error).toMatch(/already taken/i)
    expect(jobAssignee).toBe('m-1')

    // 3. Manager reassigns b-1 to m-2 (in scope) → held by m-2, pay re-stamped.
    currentAuth = { id: 'mgr', tid: 't-1', role: 'manager' }
    res = await reassign(req({ booking_id: 'b-1', to_member_id: 'm-2' }))
    expect(res.status).toBe(200)
    body = (await res.json()) as { booking: Row }
    expect(body.booking.team_member_id).toBe('m-2')
    expect(body.booking.status).toBe('confirmed')
    expect(body.booking.pay_rate).toBe(30) // re-stamped from the NEW member

    // 4. m-2 releases their own job back to the pool → open, status scheduled.
    currentAuth = { id: 'm-2', tid: 't-1', role: 'worker' }
    res = await release(req({ booking_id: 'b-1' }))
    expect(res.status).toBe(200)
    body = (await res.json()) as { booking: Row }
    expect(body.booking.team_member_id).toBeNull() // back to open pool
    expect(body.booking.status).toBe('scheduled')
    expect(jobAssignee).toBeNull()
  })

  it('refuses to release a job the member does not hold (403)', async () => {
    jobAssignee = 'm-1' // held by m-1
    currentAuth = { id: 'm-2', tid: 't-1', role: 'worker' }
    const res = await release(req({ booking_id: 'b-1' }))
    expect(res.status).toBe(403)
    expect(jobAssignee).toBe('m-1') // untouched
  })

  it('refuses a claim when the member is at their daily job cap (409)', async () => {
    members = { 'm-1': { pay_rate: 25, max_jobs_per_day: 2 } }
    claimCount = 2 // already at the cap
    currentAuth = { id: 'm-1', tid: 't-1', role: 'worker' }
    const res = await claim(req({ booking_id: 'b-2' }))
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: string }).error).toMatch(/daily job limit/i)
    expect(jobAssignee).toBeNull() // never claimed
  })
})
