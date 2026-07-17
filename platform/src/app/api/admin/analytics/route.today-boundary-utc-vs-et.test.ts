import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * bookings.created_at and clients.created_at are both TIMESTAMPTZ (aware).
 * The route's "this month" boundary built `thisMonthStart` via
 * `new Date().getFullYear()/getMonth()` -- the SERVER's local calendar (UTC
 * on Vercel), a full day ahead of ET for ~4-5h every evening. During that
 * window (the evening of the last day of the ET month), the server's UTC
 * clock has already rolled to the NEXT month, pushing `thisMonthStart` a
 * full month ahead of the true ET month boundary -- silently excluding
 * every booking/client created earlier in the real (ET) current month.
 *
 * Real time in this test: 2026-02-01T02:30:00Z = 9:30pm EST Jan 31 -- ET's
 * current month is still January. A booking created Jan 15 (clearly this ET
 * month) must still count toward `thisMonth.bookings`.
 */

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
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

describe('GET /api/admin/analytics — "this month" boundary must use ET, not server-local', () => {
  beforeEach(() => {
    DB.bookings = [
      {
        id: 'bk-jan15',
        tenant_id: 'tenant-A',
        status: 'completed',
        start_time: '2026-01-15T12:00:00',
        price: 100,
        payment_status: 'paid',
        created_at: '2026-01-15T12:00:00.000Z',
      },
    ]
    DB.clients = []
    DB.team_members = []
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-01T02:30:00.000Z')) // 9:30pm EST Jan 31
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still counts a booking created earlier in the ET-current month', async () => {
    const req = new NextRequest('https://x/api/admin/analytics')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.thisMonth.bookings).toBe(1)
  })
})
