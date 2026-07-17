import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/team-portal/crew/earnings (the crew-lead-facing pay roll-up)
 * filtered bookings.status='completed' only. POST /api/finance/payroll
 * (bulk payroll) flips a booking's status straight to 'paid' once claimed,
 * so a recently-worked, recently-paid job vanished from this trailing-30-
 * day earnings total entirely the instant payroll ran on it -- a crew
 * lead's view of their own team's earnings going blind on real, worked
 * jobs. Same blind spot already fixed on finance/summary, ar-aging,
 * pending, and cleaner-income this session.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    gte: () => c,
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

const currentAuth = { id: 'member-a', tid: TENANT, role: 'manager' as const }
vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () => ({ auth: currentAuth, error: null }),
  scopedMemberIds: async () => ['member-a'],
}))

import { GET } from './route'

beforeEach(() => {
  const now = new Date()
  const checkIn = new Date(now.getTime() - 3_600_000).toISOString()
  DB.team_members = [{ id: 'member-a', tenant_id: TENANT, name: 'Cleo', pay_rate: 25 }]
  DB.bookings = [
    // Bulk-paid via payroll: status flipped straight to 'paid'.
    { tenant_id: TENANT, team_member_id: 'member-a', pay_rate: 30, start_time: now.toISOString(), end_time: null, check_in_time: checkIn, check_out_time: now.toISOString(), status: 'paid' },
    // Still 'completed' -- baseline, must still work.
    { tenant_id: TENANT, team_member_id: 'member-a', pay_rate: 30, start_time: now.toISOString(), end_time: null, check_in_time: checkIn, check_out_time: now.toISOString(), status: 'completed' },
  ]
})

describe('GET /api/team-portal/crew/earnings — status=paid (bulk payroll) blind spot', () => {
  it('counts a bulk-paid job toward the jobs total', async () => {
    const req = new Request('https://x')
    const res = await GET(req)
    const body = await res.json()
    const row = (body.members as Row[]).find((m) => m.id === 'member-a') as Row
    expect(row.jobs).toBe(2)
  })

  it('counts the bulk-paid job\'s hours toward earnings', async () => {
    const req = new Request('https://x')
    const res = await GET(req)
    const body = await res.json()
    const row = (body.members as Row[]).find((m) => m.id === 'member-a') as Row
    // 1 hour × $30 × 2 jobs = $60
    expect(row.earnings).toBe(60)
  })
})
