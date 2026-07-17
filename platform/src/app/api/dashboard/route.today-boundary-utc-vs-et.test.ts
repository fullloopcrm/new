import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * bookings.start_time is stored naive-ET (no tz) -- exactly what was typed
 * in. This route (the main operator dashboard aggregator) built its
 * today/week/month boundaries via `new Date().getFullYear()/getMonth()/
 * getDate()/getDay()` -- the SERVER's local calendar (UTC on Vercel), a full
 * day ahead of ET for ~4-5h every evening. During that window an operator
 * opening this dashboard at 7-11pm ET saw an empty "today's jobs" section
 * despite real jobs still ahead.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5.
 * A job starting at 9pm ET the same evening (1.5h away) must still show up
 * in today's jobs.
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
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) >= String(val)); return c },
    lt: (col: string, val: unknown) => { filters.push((r) => String(r[col]) < String(val)); return c },
    lte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) <= String(val)); return c },
    order: () => c,
    then: (resolve: (v: { data: unknown; error: unknown; count: number | null }) => unknown) => {
      const rows = matched()
      return resolve({ data: headCount ? null : rows, error: null, count: headCount ? rows.length : null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenantId: TENANT, role: 'admin' })),
  AuthError: class AuthError extends Error {},
}))
vi.mock('@/lib/rbac', () => ({ hasPermission: () => true }))
vi.mock('@/lib/require-permission', () => ({ overridesFor: () => ({}) }))

import { GET } from './route'

describe('GET /api/dashboard — today boundary must use ET, not server-local', () => {
  beforeEach(() => {
    DB.bookings = [
      {
        id: 'bk-tonight',
        tenant_id: TENANT,
        start_time: '2026-01-05T21:00:00', // naive ET, 9pm -- 1.5h from "now" below
        end_time: '2026-01-05T22:00:00',
        status: 'confirmed',
        payment_status: 'unpaid',
        price: 100,
        partial_payment_cents: 0,
        clients: null,
        team_members: null,
      },
    ]
    DB.clients = []
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still includes a booking starting later tonight ET in today’s jobs', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.todayJobs as Row[]).map((b) => b.id)
    expect(ids).toContain('bk-tonight')
  })

  it('still counts a completed job just inside the trailing-30-day ET window in stats.completed', async () => {
    // thirtyDaysAgo real instant = 2025-12-07T00:30:00.000Z. This job's naive-ET
    // start_time (2025-12-06T21:00:00, 9pm ET Dec 6) is genuinely inside the
    // last 30 days (true UTC instant Dec 7 02:00Z), but a raw toISOString()
    // lower bound string-compares "2025-12-06..." < "2025-12-07..." and drops it.
    DB.bookings.push({
      id: 'bk-30d-boundary',
      tenant_id: TENANT,
      start_time: '2025-12-06T21:00:00',
      end_time: '2025-12-06T22:00:00',
      status: 'completed',
      payment_status: 'paid',
      price: 100,
      partial_payment_cents: 0,
      clients: null,
      team_members: null,
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stats.completed).toBe(1)
  })
})
