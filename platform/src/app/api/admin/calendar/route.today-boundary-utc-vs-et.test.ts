import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * bookings.start_time is stored naive-ET (no tz) -- exactly what was typed in.
 * The route built its default month range via `new Date().getFullYear()/
 * getMonth()` -- the SERVER's local calendar (UTC on Vercel), a full day
 * ahead of ET for ~4-5h every evening. During that window the month's
 * first/last day boundary was miscomputed relative to the naive-ET column.
 *
 * Real time in this test: 2026-02-01T02:30:00Z = 9:30pm EST Jan 31.
 * A booking on Jan 31 (still today in ET) must still fall inside the
 * default "current month" range (January), not get pushed into February.
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
    gte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) >= String(val)); return c },
    lte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) <= String(val)); return c },
    not: () => c,
    order: () => Promise.resolve({ data: matched(), error: null }),
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

describe('GET /api/admin/calendar — default month range must use ET, not server-local', () => {
  beforeEach(() => {
    DB.bookings = [
      {
        id: 'bk-jan31-evening',
        tenant_id: TENANT,
        start_time: '2026-01-31T21:00:00', // naive ET, 9pm Jan 31 -- still January in ET
        end_time: '2026-01-31T22:00:00',
        status: 'confirmed',
        notes: null,
        clients: null,
        team_members: null,
        tenants: null,
      },
    ]
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-01T02:30:00.000Z')) // 9:30pm EST Jan 31
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still includes a booking from the last evening of the ET month', async () => {
    const req = new NextRequest('https://x/api/admin/calendar')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.bookings as Row[]).map((b) => b.id)
    expect(ids).toContain('bk-jan31-evening')
  })
})
