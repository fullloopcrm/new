import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * bookings.payment_date is TIMESTAMPTZ (aware). The route's "month" period
 * boundary built `dateFrom` via `new Date().getFullYear()/getMonth()` --
 * the SERVER's local calendar (UTC on Vercel), a full day ahead of ET for
 * ~4-5h every evening. During that window (the evening of the last day of
 * the ET month), the server's UTC clock has already rolled to the NEXT
 * month, pushing `dateFrom` a full month ahead of the true ET month
 * boundary -- silently excluding every paid booking from earlier in the
 * real (ET) current month out of this revenue widget.
 *
 * Real time in this test: 2026-02-01T02:30:00Z = 9:30pm EST Jan 31 -- ET's
 * current month is still January. A booking paid Jan 15 (clearly this ET
 * month) must still count.
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
    lte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) <= String(val)); return c },
    order: () => c,
    range: () => c,
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { NextRequest } from 'next/server'
import { GET } from './route'

describe('GET /api/finance/revenue — "month" boundary must use ET, not server-local', () => {
  beforeEach(() => {
    DB.bookings = [
      {
        id: 'bk-jan15',
        tenant_id: TENANT,
        price: 10000,
        payment_status: 'paid',
        payment_date: '2026-01-15T12:00:00.000Z',
      },
    ]
    DB.journal_lines = []
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-01T02:30:00.000Z')) // 9:30pm EST Jan 31
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still counts a booking paid earlier in the ET-current month', async () => {
    const req = new NextRequest('https://x/api/finance/revenue?period=month')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking_count).toBe(1)
  })
})
