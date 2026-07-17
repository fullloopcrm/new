import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC' // pin server-local tz to match prod (Vercel); the naive-ET encoding depends on it

/**
 * bookings.start_time is a naive-ET TIMESTAMP (no tz) -- this route's
 * 30/90-day recency checks (`thirtyDaysAgo`/`ninetyDaysAgo`) were real-UTC
 * instants (`now.getTime() - Nd`) compared against that naive-ET column,
 * mixing two reference frames off by the EST/EDT offset. That shift could
 * make a genuinely-recent booking read as outside the window -- e.g. an
 * inactive client who actually re-booked within the true 90-day ET window
 * stayed stuck on 'inactive' instead of being reactivated.
 * clients.created_at is TIMESTAMPTZ (aware) and correctly stays real-UTC.
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
    case 'in': return Array.isArray(f.vals) && f.vals.includes(v as string)
    case 'gte': return String(v) >= String(f.val)
    case 'lt': return String(v) < String(f.val)
    default: return true
  }
}

function chain(table: string) {
  const filters: Filter[] = []
  let limitN: number | null = null
  const source = () => DB[table] || (DB[table] = [])
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
    in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', vals: vals as string[] }); return c },
    lt: (col: string, val: unknown) => { filters.push({ col, op: 'lt', val }); return c },
    gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
    limit: (n: number) => { limitN = n; return c },
    update: (patch: Row) => ({
      eq: (col1: string, val1: unknown) => ({
        in: (col2: string, ids: string[]) => {
          for (const row of source()) {
            if (row[col1] === val1 && ids.includes(row.id as string)) Object.assign(row, patch)
          }
          return Promise.resolve({ data: null, error: null })
        },
      }),
    }),
    then: (resolve: (v: { data: unknown; error: null }) => void) => {
      let rows = source().filter((r) => filters.every((f) => applyFilter(r, f)))
      if (limitN != null) rows = rows.slice(0, limitN)
      return Promise.resolve({ data: rows, error: null }).then(resolve)
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/error-tracking', () => ({ trackError: async () => {} }))

import { GET } from './route'

function req(): Request {
  return new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  for (const k of Object.keys(DB)) delete DB[k]
  DB.tenants = [{ id: TENANT, name: 'Acme', status: 'active' }]
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/cron/lifecycle — naive-ET boundary bug', () => {
  it('reactivates an inactive client whose new booking is within the true 90-day ET window', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-05T04:00:00.000Z')) // 11pm EST Feb 4

    DB.clients = [
      { id: 'c-1', tenant_id: TENANT, status: 'inactive', created_at: '2025-01-01T00:00:00.000Z' },
    ]
    DB.bookings = [
      // Nov 7, 1am ET -- inside the true 90-day ET window (90 days before
      // Feb 4, 11pm ET is Nov 6, 11pm ET), but a real-UTC bound derived from
      // the real "now" instant reads this as outside the window.
      { id: 'bk-1', tenant_id: TENANT, client_id: 'c-1', status: 'completed', start_time: '2025-11-07T01:00:00' },
    ]

    const res = await GET(req())
    const json = await res.json()
    expect(json.clients_updated).toBe(1)
    expect(DB.clients[0].status).toBe('active')
  })
})
