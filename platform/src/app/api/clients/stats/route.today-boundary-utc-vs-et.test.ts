import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * clients.created_at is TIMESTAMPTZ (aware). The route's "new this month"
 * boundary built `monthStart` via `new Date().getFullYear()/getMonth()` --
 * the SERVER's local calendar (UTC on Vercel), a full day ahead of ET for
 * ~4-5h every evening. During that window (e.g. the evening of the last
 * day of the month ET), the server's UTC clock has already rolled to the
 * NEXT month, pushing `monthStart` a full month ahead of the true ET month
 * boundary -- silently excluding every client created earlier in the real
 * (ET) current month from the "new this month" count.
 *
 * Real time in this test: 2026-02-01T02:30:00Z = 9:30pm EST Jan 31 -- ET's
 * current month is still January. A client created Jan 15 (clearly this ET
 * month) must still count toward `newThisMonth`.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let headCount = false
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: (_cols?: string, opts?: { head?: boolean; count?: string }) => {
      if (opts?.head) headCount = true
      return c
    },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) >= String(val)); return c },
    then: (resolve: (v: { data: unknown; error: unknown; count: number | null }) => unknown) => {
      const rows = matched()
      return resolve({ data: headCount ? null : rows, error: null, count: headCount ? rows.length : null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { GET } from './route'

describe('GET /api/clients/stats — "new this month" boundary must use ET, not server-local', () => {
  beforeEach(() => {
    DB.clients = [
      { id: 'c-jan15', tenant_id: TENANT, status: 'active', created_at: '2026-01-15T12:00:00.000Z', source: 'referral' },
    ]
    DB.bookings = []
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-01T02:30:00.000Z')) // 9:30pm EST Jan 31
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still counts a client created earlier in the ET-current month', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.newThisMonth).toBe(1)
  })
})
