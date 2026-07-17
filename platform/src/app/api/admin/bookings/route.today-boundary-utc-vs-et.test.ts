import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * bookings.start_time is stored naive-ET (no tz) -- exactly what was typed
 * in. The route's "today"/"this week" summary stats built their boundaries
 * via `new Date().getFullYear()/getMonth()/getDate()` -- the SERVER's local
 * calendar (UTC on Vercel), a full day ahead of ET for ~4-5h every evening.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5.
 * A booking starting at 9pm ET the same evening (1.5h away) must still
 * count toward "today" and "this week".
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let selectingCount = false
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: (_cols?: string, opts?: { head?: boolean; count?: string }) => {
      if (opts?.count) selectingCount = true
      return c
    },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => c,
    range: () => c,
    then: (resolve: (v: { data: unknown; error: unknown; count: number | null }) => unknown) => {
      const rows = matched()
      return resolve({ data: rows, error: null, count: selectingCount ? rows.length : null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn(async () => null),
}))

import { NextRequest } from 'next/server'
import { GET } from './route'

describe('GET /api/admin/bookings — "today"/"this week" stats must use ET, not server-local', () => {
  beforeEach(() => {
    DB.bookings = [
      {
        id: 'bk-tonight',
        tenant_id: TENANT,
        start_time: '2026-01-05T21:00:00', // naive ET, 9pm -- 1.5h from "now" below
        status: 'confirmed',
      },
    ]
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still counts a booking starting later tonight ET toward today/thisWeek', async () => {
    const req = new NextRequest('https://x/api/admin/bookings')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stats.today).toBe(1)
    expect(body.stats.thisWeek).toBe(1)
  })
})
