import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

/**
 * team_members.active is a stale, never-written NYC-Maid-import snapshot
 * column (see e33f55ef / migration
 * 2026_07_17_team_members_active_column_backfill_PROPOSED.sql) that drifts
 * from `status`, the field HR termination actually maintains. This route's
 * team_members query used to filter `.neq('active', false)` -- a live
 * sample found 5/50 rows where status='active' but active=false. Any team
 * member in that state was dropped from rowMap entirely, so their gross
 * pay, balance owed, and $600 1099 threshold silently vanished from the
 * payroll/1099 report even though they were currently active and had real
 * completed bookings. Fixed by dropping the filter -- this report needs
 * every team member with in-period activity, active or not (a terminated
 * contractor's mid-year earnings still need to be 1099'd).
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const teamMembers: Row[] = [
  // Currently active per `status`, but the stale `active` column (frozen at
  // import time) says false -- the exact live-data disagreement found.
  { id: 'tm-stale', tenant_id: TENANT, name: 'Dana', status: 'active', active: false },
]

const bookings: Row[] = [
  { id: 'bk-1', tenant_id: TENANT, team_member_id: 'tm-stale', status: 'completed', start_time: '2026-03-10T10:00:00Z', team_member_pay: 70000, actual_hours: 6 },
]

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      neq: (col: string, val: unknown) => { filters.push({ col, op: 'neq', val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', val: vals }); return c },
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      lte: (col: string, val: unknown) => { filters.push({ col, op: 'lte', val }); return c },
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
        const source = table === 'team_members' ? teamMembers : table === 'bookings' ? bookings : table === 'team_member_payouts' ? [] : []
        const rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'neq') return rowVal !== f.val
            if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(rowVal)
            if (f.op === 'gte') return String(rowVal) >= String(f.val)
            if (f.op === 'lte') return String(rowVal) <= String(f.val)
            return true
          }),
        )
        return Promise.resolve({ data: rows, error: null }).then(resolve)
      },
    }
    return c
  }
  const client = { from: (table: string) => chain(table) }
  return { supabaseAdmin: client }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

import { GET } from './route'

function req(qs: string): Request {
  return new Request(`https://app.fullloop.example/api/finance/payroll-prep${qs}`)
}

describe('GET /api/finance/payroll-prep — does not filter team_members on the stale active column', () => {
  it('includes a currently-active team member whose stale active column disagrees with status', async () => {
    const res = await GET(req('?from=2026-03-01&to=2026-03-31'))
    const json = await res.json()
    const dana = json.rows.find((r: Row) => r.team_member_id === 'tm-stale')
    expect(dana).toBeTruthy()
    expect(dana.gross_pay_cents).toBe(70000)
  })

  it('flags the 1099 threshold for that team member instead of silently dropping them', async () => {
    const res = await GET(req('?year=2026'))
    const json = await res.json()
    const dana = json.rows.find((r: Row) => r.team_member_id === 'tm-stale')
    expect(dana.hits_1099_threshold).toBe(true)
  })
})
