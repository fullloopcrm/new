import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * bookings.start_time is stored naive-ET (no tz) -- exactly what was typed in.
 * The route built its trailing-30-day lower bound via `since.toISOString()` --
 * a true-UTC clock reading -- string-compared against the naive-ET column.
 * That shifts the cutoff by the EST/EDT offset, silently dropping a real
 * worked job from a crew lead's earnings roll-up near the boundary.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5.
 * since = 30 days earlier = 2025-12-07T00:30:00.000Z (true UTC instant).
 * A job worked at 9pm ET Dec 6 (true UTC instant Dec 7 02:00Z, genuinely
 * inside the last 30 days) must still count.
 */

const TENANT = 'tenant-A'

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
    gte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) >= String(val)); return c },
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

describe('GET /api/team-portal/crew/earnings — 30-day boundary must use ET, not true-UTC', () => {
  beforeEach(() => {
    DB.team_members = [{ id: 'member-a', tenant_id: TENANT, name: 'Cleo', pay_rate: 25 }]
    DB.bookings = [
      {
        tenant_id: TENANT,
        team_member_id: 'member-a',
        pay_rate: 30,
        start_time: '2025-12-06T21:00:00', // naive ET, 9pm Dec 6 -- true UTC instant Dec 7 02:00Z
        end_time: null,
        check_in_time: '2025-12-06T21:00:00',
        check_out_time: '2025-12-06T22:00:00',
        status: 'completed',
      },
    ]
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still counts a job worked just inside the trailing-30-day ET window', async () => {
    const res = await GET(new Request('https://x'))
    const body = await res.json()
    const row = (body.members as Row[]).find((m) => m.id === 'member-a') as Row
    expect(row.jobs).toBe(1)
    expect(row.earnings).toBe(30) // 1h × $30
  })
})
