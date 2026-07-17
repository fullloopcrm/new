import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * GET /api/cron/retention (daily 30-90 day win-back SMS) filtered its client
 * roster on `clients.active` -- a stale, never-written NYC-Maid-import
 * snapshot column (see 2026_07_17_clients_active_column_backfill_PROPOSED.sql).
 * A production sample found 426 of 439 status='inactive' clients still read
 * active=true, and the filter never checked `status='do_not_contact'` at
 * all -- so this daily cron was sending unsolicited retention SMS to clients
 * explicitly flagged do-not-contact or inactive in the CRM, while a
 * currently active client with a stale active=false silently never got
 * retention outreach. Fixed to filter on `status`, excluding both
 * 'inactive' and 'do_not_contact'.
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

describe('GET /api/cron/retention — filters clients on status, not the stale active column', () => {
  it('excludes a client explicitly marked do_not_contact even though the stale active column says true', async () => {
    DB.clients = [
      { id: 'c-dnc', tenant_id: TENANT, name: 'DNC Dana', phone: '+15550001111', status: 'do_not_contact', active: true, sms_consent: true },
    ]
    DB.bookings = [
      { id: 'bk-1', tenant_id: TENANT, client_id: 'c-dnc', status: 'completed', end_time: daysAgoIso(45) },
    ]

    const res = await GET(req())
    const json = await res.json()
    expect(json.sent).toBe(0)
    expect(smsSends).toEqual([])
  })

  it('excludes an inactive client even though the stale active column says true', async () => {
    DB.clients = [
      { id: 'c-inactive', tenant_id: TENANT, name: 'Inactive Ivan', phone: '+15550002222', status: 'inactive', active: true, sms_consent: true },
    ]
    DB.bookings = [
      { id: 'bk-2', tenant_id: TENANT, client_id: 'c-inactive', status: 'completed', end_time: daysAgoIso(45) },
    ]

    const res = await GET(req())
    const json = await res.json()
    expect(json.sent).toBe(0)
    expect(smsSends).toEqual([])
  })

  it('still sends to a currently active client whose stale active column says false', async () => {
    DB.clients = [
      { id: 'c-stale', tenant_id: TENANT, name: 'Stale Steve', phone: '+15550003333', status: 'active', active: false, sms_consent: true },
    ]
    DB.bookings = [
      { id: 'bk-3', tenant_id: TENANT, client_id: 'c-stale', status: 'completed', end_time: daysAgoIso(45) },
    ]

    const res = await GET(req())
    const json = await res.json()
    expect(json.sent).toBe(1)
    expect(smsSends).toEqual(['+15550003333'])
  })
})
