import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * website_visits.created_at is TIMESTAMPTZ (aware). The route's "today"
 * visit count built `todayStart` via `new Date().getFullYear()/getMonth()/
 * getDate()` -- the SERVER's local calendar (UTC on Vercel), a full day
 * ahead of ET for ~4-5h every evening. During that window `todayStart` sat
 * a full day LATER than the true ET-midnight boundary, silently excluding
 * a visit from earlier that ET evening out of "today"'s count.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5.
 * A visit at 5pm EST Jan 5 (2026-01-05T22:00:00Z) is still "today" in ET
 * and must count.
 */

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let orderCol: string | null = null
  let limitN: number | null = null
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => {
    let rows = rowsOf().filter((r) => filters.every((f) => f(r)))
    if (orderCol) rows = [...rows].sort((a, b) => String(b[orderCol!]).localeCompare(String(a[orderCol!])))
    if (limitN != null) rows = rows.slice(0, limitN)
    return rows
  }
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    order: (col: string) => { orderCol = col; return c },
    limit: (n: number) => { limitN = n; return c },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn(async () => null),
}))

import { NextRequest } from 'next/server'
import { GET } from './route'

describe('GET /api/admin/websites — "today" visit count must use ET, not server-local', () => {
  beforeEach(() => {
    DB.website_visits = [
      {
        id: 'v-5pm-et',
        tenant_id: 'tenant-A',
        action: 'visit',
        cta_type: null,
        created_at: '2026-01-05T22:00:00.000Z', // 5pm EST Jan 5
      },
    ]
    DB.tenants = [{ id: 'tenant-A', name: 'Tenant A' }]
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still counts a visit from earlier tonight ET toward "today"', async () => {
    const req = new NextRequest('https://x/api/admin/websites')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stats.todayVisits).toBe(1)
  })
})
