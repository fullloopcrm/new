import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'
process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'

/**
 * bookings.start_time is stored naive-ET (no tz) -- exactly what was typed in.
 * The route built `todayStart`/`todayEnd` (and the Mon-Sun week window) via
 * `new Date().getFullYear()/getMonth()/getDate()/getDay()` -- the SERVER's
 * local calendar (UTC on Vercel), a full day ahead of ET for ~4-5h every
 * evening. During that window a field worker opening their earnings screen
 * saw $0 "today's potential earnings" despite real jobs still ahead, and the
 * weekly total silently excluded them too.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5.
 * A job starting at 9pm ET the same evening (1.5h away) must still count
 * toward both today's potential earnings and this week's total.
 */

const TENANT = 'tenant-A'
const MEMBER_ID = 'member-a'

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
    neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) >= String(val)); return c },
    lt: (col: string, val: unknown) => { filters.push((r) => String(r[col]) < String(val)); return c },
    lte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) <= String(val)); return c },
    order: () => c,
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { GET } from './route'

describe('GET /api/team-portal/earnings — today/week boundary must use ET, not server-local', () => {
  beforeEach(() => {
    DB.team_members = [{ id: MEMBER_ID, tenant_id: TENANT, pay_rate: 30 }]
    DB.bookings = [
      {
        id: 'bk-tonight',
        tenant_id: TENANT,
        team_member_id: MEMBER_ID,
        start_time: '2026-01-05T21:00:00', // naive ET, 9pm -- 1.5h from "now" below
        end_time: '2026-01-05T22:00:00',
        status: 'confirmed',
        pay_rate: null,
        team_member_pay: null,
        check_in_time: null,
        check_out_time: null,
      },
    ]
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still counts a job starting later tonight ET toward today’s potential earnings', async () => {
    const token = createToken(MEMBER_ID, TENANT, 30, 'worker')
    const req = new NextRequest('https://x/api/team-portal/earnings', { headers: { authorization: `Bearer ${token}` } })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.earnings.todayPotentialHours).toBeGreaterThan(0)
  })
})
