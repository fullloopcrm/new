import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * bookings.start_time is stored naive-ET (no tz) -- exactly what was typed in,
 * e.g. "2026-01-05T22:00:00" means 10pm ET, literally. The route built its
 * lower bound via `new Date().toISOString()` -- a true-UTC clock reading --
 * compared as a string against the naive-ET column. During the evening window
 * where the UTC clock reads several hours ahead of ET (EST is UTC-5), that
 * lower bound sat hours in the FUTURE relative to real ET "now", silently
 * dropping a crew member's imminent jobs from their own upcoming-schedule view.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5.
 * A job starting at 9pm ET the same evening (1.5h away) must still show up.
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
    lt: (col: string, val: unknown) => { filters.push((r) => String(r[col]) < String(val)); return c },
    not: () => c,
    order: () => Promise.resolve({ data: matched(), error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () => ({ auth: { id: 'member-a', tid: TENANT, role: 'manager' }, error: null }),
  scopedMemberIds: async () => ['member-a'],
}))

import { GET } from './route'

describe('GET /api/team-portal/crew/schedule — today boundary must use ET, not true-UTC', () => {
  beforeEach(() => {
    DB.bookings = [
      {
        id: 'bk-tonight',
        tenant_id: TENANT,
        team_member_id: 'member-a',
        start_time: '2026-01-05T21:00:00', // naive ET, 9pm -- 1.5h from "now" below
        end_time: '2026-01-05T22:00:00',
        status: 'confirmed',
      },
    ]
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still returns a job starting later tonight ET', async () => {
    const res = await GET(new Request('https://x'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.jobs as Row[]).map((j) => j.id)
    expect(ids).toContain('bk-tonight')
  })
})
