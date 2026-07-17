import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * POST /api/team-portal/jobs/claim enforces a per-member daily claim cap
 * (`max_jobs_per_day`) by counting the member's own bookings starting
 * "today". The window was built via `new Date().setHours(0,0,0,0)` -- the
 * SERVER's local calendar (UTC on Vercel), which runs a full calendar day
 * ahead of ET for ~4-5h every evening (8pm-midnight ET). During that window
 * the count window silently shifted to tomorrow's ET date against naive-ET
 * `bookings.start_time`, missing a booking earlier the same real ET day and
 * letting a member claim past their cap.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5 -- UTC has
 * already rolled to Jan 6, ET has not.
 */
process.env.TZ = 'UTC'
process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const MEMBER_ID = 'member-a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    is: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    select: () => uc,
    maybeSingle: async () => {
      const matched = rows.filter((r) => filters.every((f) => f(r)))
      matched.forEach((r) => Object.assign(r, values))
      return { data: matched[0] ?? null, error: null }
    },
  }
  return uc
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let headCount = false
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: (_cols?: string, opts?: { head?: boolean }) => { headCount = !!opts?.head; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) >= (val as string)); return c },
    lte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) <= (val as string)); return c },
    lt: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) < (val as string)); return c },
    not: (col: string, _op: string, val: unknown) => { filters.push((r) => r[col] !== val); return c },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    maybeSingle: async () => ({ data: matched()[0] ?? null, error: null }),
    update: (values: Row) => updateChain(rowsOf(), values),
    then: (resolve: (v: { data: unknown; count?: number; error: unknown }) => unknown) => {
      if (headCount) { resolve({ data: null, count: matched().length, error: null }); return }
      resolve({ data: matched(), error: null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(() => Promise.resolve()) }))

import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { POST } from './route'

describe('POST /api/team-portal/jobs/claim — daily cap must use ET day, not server-local (UTC) day', () => {
  beforeEach(() => {
    DB.team_members = [{ id: MEMBER_ID, tenant_id: TENANT_A, status: 'active', pay_rate: 25, max_jobs_per_day: 1 }]
    DB.bookings = [
      // Already has a job earlier the SAME real ET day (Jan 5, 10am ET) --
      // must count toward today's cap.
      { id: 'already-today', tenant_id: TENANT_A, team_member_id: MEMBER_ID, status: 'confirmed', start_time: '2026-01-05T10:00:00' },
      // The one being claimed, later the same ET evening.
      { id: 'to-claim', tenant_id: TENANT_A, team_member_id: null, status: 'scheduled', start_time: '2026-01-05T21:00:00' },
    ]
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects the claim: the existing same-ET-day booking already fills the cap of 1', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 25, 'worker')
    const req = new NextRequest('https://x/api/team-portal/jobs/claim', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: 'to-claim' }),
    })
    const res = await POST(req)
    // Pre-fix: server-local (UTC) day boundary rolled to Jan 6, so the Jan 5
    // 10am booking fell outside the counted window -- count came back 0 and
    // this incorrectly returned 200, letting the member exceed their cap.
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/Daily job limit reached/)
  })
})
