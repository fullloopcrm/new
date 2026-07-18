import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * GET /api/cron/retention filtered on `status` (excluding inactive/
 * do_not_contact) and `sms_consent = true`, but never checked the separate
 * `do_not_service` boolean column -- the stronger, channel-agnostic
 * kill-switch this session's booking-lifecycle/campaign fixes (89c2cdd9,
 * 14fa0888, da0b904d) treat as absolute. A client with status='active' and
 * sms_consent=true but do_not_service=true still got unsolicited 30-90 day
 * win-back SMS.
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

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

beforeEach(() => {
  smsSends.length = 0
  for (const k of Object.keys(DB)) delete DB[k]
  DB.tenants = [
    { id: TENANT, name: 'Acme', status: 'active', telnyx_api_key: 'key', telnyx_phone: '+15551234567' },
  ]
  DB.notifications = []
})

describe('GET /api/cron/retention — do_not_service gate', () => {
  it('excludes a do_not_service client even with status active and sms_consent true', async () => {
    DB.clients = [
      { id: 'c-dns', tenant_id: TENANT, name: 'DNS Dana', phone: '+15550001111', status: 'active', sms_consent: true, do_not_service: true },
    ]
    DB.bookings = [
      { id: 'bk-1', tenant_id: TENANT, client_id: 'c-dns', status: 'completed', end_time: daysAgoIso(45) },
    ]

    const res = await GET(req())
    const json = await res.json()
    expect(json.sent).toBe(0)
    expect(smsSends).toEqual([])
  })

  it('still sends to an eligible client not flagged do_not_service', async () => {
    DB.clients = [
      { id: 'c-ok', tenant_id: TENANT, name: 'OK Olivia', phone: '+15550002222', status: 'active', sms_consent: true, do_not_service: false },
    ]
    DB.bookings = [
      { id: 'bk-2', tenant_id: TENANT, client_id: 'c-ok', status: 'completed', end_time: daysAgoIso(45) },
    ]

    const res = await GET(req())
    const json = await res.json()
    expect(json.sent).toBe(1)
    expect(smsSends).toEqual(['+15550002222'])
  })
})
