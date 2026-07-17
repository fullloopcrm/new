import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC' // pin server-local tz to match prod (Vercel); the naive-ET encoding depends on it

/**
 * bookings.start_time is naive-ET TIMESTAMP (no tz) -- this route excluded
 * "already scheduled" clients from outreach using a real-UTC `now` bound,
 * which runs ahead of true ET-now by the EST/EDT offset. Any booking
 * scheduled between true ET-now and (ET-now + offset) read as NOT upcoming,
 * so a client with a job later that same day still got the outreach text.
 *
 * Real time in this test: 10am EST Jan 10 (real-UTC 15:00Z). A booking at
 * 2pm ET the same day (naive-ET "14:00:00", 4 hours away) must still count
 * as "scheduled" and exclude the client from outreach.
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
    case 'gte': return String(v) >= String(f.val)
    case 'is': return f.val === null ? (v === null || v === undefined) : v === f.val
    default: return true
  }
}

function chain(table: string) {
  const filters: Filter[] = []
  const source = () => DB[table] || (DB[table] = [])
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
    neq: (col: string, val: unknown) => { filters.push({ col, op: 'neq', val }); return c },
    in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', vals: vals as string[] }); return c },
    not: (col: string, op: string, val: unknown) => {
      if (op === 'is') filters.push({ col, op: 'is', val: val === null ? '__not_null__' : val })
      return c
    },
    gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
    insert: (row: Row) => { source().push(row); return Promise.resolve({ data: row, error: null }) },
    delete: () => ({ eq: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) }) }),
    update: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      const rows = source().filter((r) => filters.every((f) => {
        if (f.op === 'is' && f.val === '__not_null__') return r[f.col] != null
        return applyFilter(r, f)
      }))
      return Promise.resolve({ data: rows, error: null }).then(resolve)
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/comms-prefs', () => ({ getCommPrefs: async () => ({ comms: {} }) }))
vi.mock('@/lib/outreach', () => ({
  getActiveMoments: () => [{ id: 'test-moment', name: 'Test Moment', petTypes: null, template: 'hi' }],
  pickMessage: () => 'Hey there!',
  qualifiesForMoment: () => true,
}))

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
  DB.recurring_schedules = []
  DB.deals = []
  DB.outreach_log = []
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /api/cron/outreach — naive-ET boundary bug', () => {
  it('does not text a client who has a booking later the same ET day', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-10T15:00:00.000Z')) // 10am EST Jan 10

    DB.clients = [
      { id: 'c-1', tenant_id: TENANT, name: 'Later Today Larry', phone: '+15550001111', status: 'active', pet_name: 'Rex', pet_type: 'dog', do_not_service: false, sms_marketing_opt_out: false, sms_consent: true, outreach_count: 0 },
    ]
    DB.bookings = [
      // 2pm ET same day -- 4h from now, naive-ET encoding (no Z).
      { id: 'bk-1', tenant_id: TENANT, client_id: 'c-1', status: 'scheduled', start_time: '2026-01-10T14:00:00' },
    ]

    const res = await GET(req())
    const json = await res.json()
    expect(json.sent).toBe(0)
    expect(smsSends).toEqual([])
  })
})
