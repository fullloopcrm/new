import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * bookings.start_time is stored naive-ET (no tz) -- exactly what was typed in.
 * The route compared a true-UTC `now.toISOString()` (and a server-local-
 * calendar `weekEnd`) against that naive-ET column. During the evening
 * window where the UTC clock reads hours ahead of ET, the "this week" lower
 * bound sat hours in the future relative to real ET "now", silently
 * excluding a job later tonight from the operator dashboard's weekly count.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5.
 * A job starting at 9pm ET the same evening (1.5h away) must still count.
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
    select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
      selectingCount = !!opts?.count
      return c
    },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) >= String(val)); return c },
    lt: (col: string, val: unknown) => { filters.push((r) => String(r[col]) < String(val)); return c },
    then: (resolve: (v: { data: unknown; error: unknown; count: number | null }) => unknown) => {
      const rows = matched()
      return resolve({ data: selectingCount ? null : rows, error: null, count: selectingCount ? rows.length : null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { GET } from './route'

describe('GET /api/bookings/stats — "this week" boundary must use ET, not true-UTC', () => {
  beforeEach(() => {
    DB.bookings = [
      {
        id: 'bk-tonight',
        tenant_id: TENANT,
        start_time: '2026-01-05T21:00:00', // naive ET, 9pm -- 1.5h from "now" below
        end_time: '2026-01-05T22:00:00',
        status: 'confirmed',
        payment_status: 'unpaid',
        payment_date: null,
        price: 100,
      },
    ]
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still counts a job starting later tonight ET in "this week"', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.thisWeek).toBe(1)
  })
})
