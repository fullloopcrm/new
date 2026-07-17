import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/schedule-issues/fix — 'day_off' plan unconditionally
 * unassigned team_member_id and reverted status to 'pending' with no check
 * that the booking was still in the state that triggered the issue. Nothing
 * else in the codebase resolves a schedule_issues row when its booking
 * changes (the only auto-heal sweep in cron/schedule-monitor is gated to
 * NYC Maid tenants), so a stale open day_off issue could sit for days after
 * the booking was manually reassigned to an available member or completed.
 * Clicking "Fix" on it would then unassign the new (correct) member or
 * revert a completed job back to pending. Fixed by re-checking the
 * booking's current status/assignment against what the issue flagged before
 * applying the mutation -- if either has changed, the fix now falls back to
 * an acknowledge-only no-op instead of a destructive overwrite.
 */

const TENANT = 't-1'
const ISSUE_ID = 'issue-1'
const BOOKING_ID = 'booking-1'
const FLAGGED_MEMBER = 'member-flagged'
const NEW_MEMBER = 'member-new'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}

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
      maybeSingle: async () => {
        const rows = (store[table] || []).filter(match)
        return { data: rows[0] || null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (updatePayload) {
          store[table] = (store[table] || []).map((r) => (match(r) ? { ...r, ...updatePayload } : r))
          return res({ data: null, error: null })
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

describe('POST /api/admin/schedule-issues/fix — stale day_off guard', () => {
  beforeEach(() => {
    store.schedule_issues = [
      { id: ISSUE_ID, tenant_id: TENANT, type: 'day_off', message: 'flagged', booking_id: BOOKING_ID, team_member_id: FLAGGED_MEMBER, status: 'open' },
    ]
    store.bookings = [
      { id: BOOKING_ID, tenant_id: TENANT, start_time: '2026-08-01T10:00:00', end_time: '2026-08-01T12:00:00', price: 10000, hourly_rate: 5000, team_member_id: FLAGGED_MEMBER, status: 'scheduled' },
    ]
  })

  it('applies the unassign+pending fix when the booking is still in the flagged state', async () => {
    const res = await POST(jsonReq({ id: ISSUE_ID, apply: true }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.preview.acknowledgeOnly).toBe(false)
    expect(store.bookings[0].team_member_id).toBeNull()
    expect(store.bookings[0].status).toBe('pending')
  })

  it('falls back to acknowledge-only when the booking has since been reassigned to a different member', async () => {
    store.bookings[0].team_member_id = NEW_MEMBER
    const res = await POST(jsonReq({ id: ISSUE_ID, apply: true }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.preview.acknowledgeOnly).toBe(true)
    // The new member's assignment must survive -- not get unassigned by the stale plan.
    expect(store.bookings[0].team_member_id).toBe(NEW_MEMBER)
  })

  it('falls back to acknowledge-only when the booking has since been completed', async () => {
    store.bookings[0].status = 'completed'
    const res = await POST(jsonReq({ id: ISSUE_ID, apply: true }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.preview.acknowledgeOnly).toBe(true)
    // The completed record must survive -- not get reverted to pending/unassigned.
    expect(store.bookings[0].status).toBe('completed')
    expect(store.bookings[0].team_member_id).toBe(FLAGGED_MEMBER)
  })
})
