import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC' // pin server-local tz to match prod (Vercel); the naive-ET encoding depends on it

/**
 * bookings.start_time/end_time are naive-ET TIMESTAMP columns (no tz) --
 * their parsed digits ARE ET wall-clock, not a real UTC instant. This route
 * built its 30/90-day eligibility window and its "does this client have an
 * upcoming booking" check from real-UTC `now`/`.toISOString()`, comparing a
 * real-UTC reference frame against the naive-ET-encoded column:
 *
 * 1. The upcoming-booking guard (`.gte('start_time', now.toISOString())`)
 *    ran ~4-5h (EST/EDT offset) ahead of true ET-now for part of every
 *    evening, so a booking starting within that window read as NOT
 *    upcoming -- sending an unwanted retention text to a client who
 *    already has a job scheduled in the next few hours.
 * 2. `thirtyDaysAgo`/`ninetyDaysAgo` were real-UTC instants compared
 *    against a naive-ET-parsed `lastDate`, shifting the 30/90-day window
 *    by the same offset -- a client whose last booking was still short of
 *    30 days ago (by true ET reckoning) could clear the "recent enough to
 *    skip" check early and get a premature retention text.
 */

process.env.CRON_SECRET = 'test-secret'

const TENANT = 'tenant-A'

type Row = Record<string, unknown>
type Filter = { col: string; op: string; val?: unknown; vals?: string[] }

const DB: Record<string, Row[]> = {}

function applyFilter(row: Row, f: Filter): boolean {
  const v = row[f.col]
  switch (f.op) {
    case 'eq': return v === f.val
    case 'neq': return v !== f.val
    case 'in': return Array.isArray(f.vals) && f.vals.includes(v as string)
    case 'not-in': return !(Array.isArray(f.vals) && f.vals.includes(v as string))
    case 'gte': return String(v) >= String(f.val)
    case 'is': return f.val === null ? (v === null || v === undefined) : v === f.val
    case 'not-is': return f.val === null ? !(v === null || v === undefined) : v !== f.val
    default: return true
  }
}

function chain(table: string) {
  const filters: Filter[] = []
  let single = false
  let limitN: number | null = null
  let countMode = false
  const source = () => DB[table] || (DB[table] = [])
  const c: Record<string, unknown> = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => { if (opts?.count) countMode = true; return c },
    eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
    neq: (col: string, val: unknown) => { filters.push({ col, op: 'neq', val }); return c },
    in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', vals: vals as string[] }); return c },
    not: (col: string, op: string, val: unknown) => {
      if (op === 'in') {
        const vals = String(val).replace(/[()]/g, '').split(',')
        filters.push({ col, op: 'not-in', vals })
      } else if (op === 'is') {
        filters.push({ col, op: 'not-is', val })
      }
      return c
    },
    gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
    order: () => c,
    limit: (n: number) => { limitN = n; return c },
    single: () => { single = true; return c },
    insert: (row: Row) => { source().push(row); return Promise.resolve({ data: row, error: null }) },
    then: (resolve: (v: { data: unknown; error: unknown; count?: number | null }) => unknown) => {
      let rows = source().filter((r) => filters.every((f) => applyFilter(r, f)))
      if (countMode) return Promise.resolve({ data: null, error: null, count: rows.length }).then(resolve)
      if (limitN != null) rows = rows.slice(0, limitN)
      if (single) return Promise.resolve({ data: rows[0] || null, error: rows[0] ? null : { message: 'no rows' } }).then(resolve)
      return Promise.resolve({ data: rows, error: null }).then(resolve)
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

const smsSends: string[] = []
vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(async ({ to }: { to: string }) => { smsSends.push(to) }),
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  smsSends.length = 0
  for (const k of Object.keys(DB)) delete DB[k]
  DB.tenants = [
    { id: TENANT, name: 'Acme', status: 'active', telnyx_api_key: 'key', telnyx_phone: '+15551234567' },
  ]
  DB.notifications = []
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/cron/retention — naive-ET boundary bugs', () => {
  it('does not send retention SMS to a client with a booking starting in a few hours (real time: 11:30pm EST Jan 5)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T04:30:00.000Z')) // 11:30pm EST Jan 5

    DB.clients = [
      { id: 'c-1', tenant_id: TENANT, name: 'Imminent Ivy', phone: '+15550001111', status: 'active', sms_consent: true },
    ]
    DB.bookings = [
      // Comfortably mid-window (~45 days ago) so the 30/90-day check isn't in play here.
      { id: 'bk-past', tenant_id: TENANT, client_id: 'c-1', status: 'completed', end_time: '2025-11-22T10:00:00' },
      // Upcoming: 2am ET Jan 6 -- ~2.5h from true ET-now (11:30pm ET Jan 5).
      { id: 'bk-future', tenant_id: TENANT, client_id: 'c-1', status: 'confirmed', start_time: '2026-01-06T02:00:00' },
    ]

    const res = await GET(req())
    const json = await res.json()
    expect(json.sent).toBe(0)
    expect(smsSends).toEqual([])
  })

  it('does not send a premature retention text before the client\'s last booking actually clears 30 days ago in ET', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-05T04:00:00.000Z')) // 11pm EST Feb 4

    DB.clients = [
      { id: 'c-2', tenant_id: TENANT, name: 'Almost Amy', phone: '+15550002222', status: 'active', sms_consent: true },
    ]
    DB.bookings = [
      // 1am ET Jan 6 -- 29 days 22h before true ET-now (11pm ET Feb 4), i.e. still short of 30 days.
      { id: 'bk-recent', tenant_id: TENANT, client_id: 'c-2', status: 'completed', end_time: '2026-01-06T01:00:00' },
    ]

    const res = await GET(req())
    const json = await res.json()
    expect(json.sent).toBe(0)
    expect(smsSends).toEqual([])
  })
})
