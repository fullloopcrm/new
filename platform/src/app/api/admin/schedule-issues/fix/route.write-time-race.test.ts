import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * route.stale-day-off.test.ts already covers buildFixPlan's own read-time
 * staleness guard (booking already reassigned/completed BEFORE the fix
 * request starts). This file covers the narrower gap that guard can't see:
 * a concurrent status/assignment change landing strictly BETWEEN
 * buildFixPlan's read and the write below it -- e.g. a team member checking
 * in the instant after the read returns, while an admin's "Fix" click is
 * still in flight. The old code applied the unassign+revert-to-pending
 * mutation unconditionally, using no field beyond a bare `.eq('id', ...)` --
 * it would silently corrupt the now-in-progress booking. Fixed by
 * optimistic-locking the write on the exact from-values buildFixPlan read
 * (mirrors the atomic-recheck pattern on client/reschedule and the
 * recurring-schedules exception route). Simulated organically: the fake
 * DB's booking SELECT mutates the underlying row (standing in for a
 * concurrent checkin) as a side effect, but returns the pre-mutation
 * snapshot -- exactly what buildFixPlan would see mid-race in production.
 */

const TENANT = 't-1'
const ISSUE_ID = 'issue-1'
const BOOKING_ID = 'booking-1'
const FLAGGED_MEMBER = 'member-flagged'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}
const raceFlip: { mutate: ((row: Row) => void) | null } = { mutate: null }

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT) }))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let updatePayload: Row | null = null
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { updatePayload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      is: (col: string, val: unknown) => { eqs[col] = val; return c },
      maybeSingle: async () => {
        const rows = (store[table] || []).filter(match)
        const row = rows[0] || null
        const snapshot = row ? { ...row } : null
        if (table === 'bookings' && raceFlip.mutate && row) {
          raceFlip.mutate(row)
          raceFlip.mutate = null
        }
        return { data: snapshot, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (updatePayload) {
          const matched = (store[table] || []).filter(match)
          store[table] = (store[table] || []).map((r) => (match(r) ? { ...r, ...updatePayload } : r))
          return res({ data: matched.map((r) => ({ id: r.id })), error: null })
        }
        const rows = (store[table] || []).filter(match)
        return res({ data: rows, error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

import { POST } from '@/app/api/admin/schedule-issues/fix/route'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/admin/schedule-issues/fix', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/schedule-issues/fix — write-time race guard', () => {
  beforeEach(() => {
    store.schedule_issues = [
      { id: ISSUE_ID, tenant_id: TENANT, type: 'day_off', message: 'flagged', booking_id: BOOKING_ID, team_member_id: FLAGGED_MEMBER, status: 'open' },
    ]
    store.bookings = [
      { id: BOOKING_ID, tenant_id: TENANT, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00', price: 10000, hourly_rate: 5000, team_member_id: FLAGGED_MEMBER, status: 'scheduled' },
    ]
    raceFlip.mutate = null
  })

  it('does not revert an already-checked-in booking when check-in lands between the read and the write', async () => {
    raceFlip.mutate = (row) => { row.status = 'in_progress' }

    const res = await POST(jsonReq({ id: ISSUE_ID, apply: true }))
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.applied).toBe(false)
    expect(json.preview.acknowledgeOnly).toBe(true)
    // The in-progress job must survive -- not get reverted to pending/unassigned.
    expect(store.bookings[0].status).toBe('in_progress')
    expect(store.bookings[0].team_member_id).toBe(FLAGGED_MEMBER)
  })

  it('control: still applies when nothing races', async () => {
    const res = await POST(jsonReq({ id: ISSUE_ID, apply: true }))
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.applied).toBe(true)
    expect(store.bookings[0].status).toBe('pending')
    expect(store.bookings[0].team_member_id).toBeNull()
  })
})
