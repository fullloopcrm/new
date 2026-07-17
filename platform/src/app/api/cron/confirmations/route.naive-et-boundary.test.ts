import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * bookings.start_time is stored naive-ET (no tz). The team-confirm window
 * was bounded with `now.toISOString()` / `twoDaysAhead.toISOString()` --
 * real UTC instants. Postgres drops the tz marker for a `timestamp without
 * time zone` column, so the UTC clock digits were read as if they were ET
 * clock digits, shifting the whole window later by the EST/EDT offset.
 * Net effect: a job starting within the next ~4-5h (ET) fell BELOW the
 * shifted lower bound and silently stopped getting the hourly
 * confirm-request resend right when confirmation matters most.
 *
 * Fake clock: 2026-01-06T08:00:00Z = 3am EST Jan 6. Booking starts 5am ET
 * the same morning -- 2 hours away, well inside the "next 48h" window.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  {
    id: 'bk-imminent', tenant_id: TENANT, status: 'scheduled', team_member_id: 'tm-1',
    start_time: '2026-01-06T05:00:00', end_time: '2026-01-06T06:00:00', // naive ET, 2h from "now"
    clients: { name: 'Jane Client', address: '123 Main St' },
    team_members: { name: 'Cleaner Chris', phone: '+15551234567' },
  },
]

const notifications: Row[] = []
const tenants: Row[] = [
  { id: TENANT, name: 'Acme Cleaning', telnyx_api_key: 'key', telnyx_phone: '+15550000000', status: 'active' },
]

const sentSms: Row[] = []
const notificationInserts: Row[] = []

vi.mock('@/lib/secret-compare', () => ({ safeEqual: () => true }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async (args: Row) => { sentSms.push(args); return {} }) }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: async () => ({ comms: { confirmation_reminder: { sms: true } }, timing: {} }),
}))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', val: vals }); return c },
      is: (col: string, val: unknown) => { filters.push({ col, op: 'is', val }); return c },
      not: () => c,
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      lte: (col: string, val: unknown) => { filters.push({ col, op: 'lte', val }); return c },
      order: () => c,
      returns: () => c,
      single: () => {
        const rows = applyFilters()
        return Promise.resolve({ data: rows[0] ?? null, error: null })
      },
      limit: () => c,
      insert: (row: Row) => {
        if (table === 'notifications') notificationInserts.push(row)
        return Promise.resolve({ data: null, error: null })
      },
      then: (resolve: (v: { data: unknown; error: null; count?: number }) => unknown) => {
        const rows = applyFilters()
        return Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve)
      },
    }
    function applyFilters() {
      const source = table === 'tenants' ? tenants : table === 'bookings' ? bookings : table === 'notifications' ? notifications : []
      return source.filter((row) =>
        filters.every((f) => {
          const rowVal = row[f.col]
          if (f.op === 'eq') return rowVal === f.val
          if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(rowVal)
          if (f.op === 'is') return rowVal === f.val
          if (f.op === 'gte') return rowVal != null && String(rowVal) >= String(f.val)
          if (f.op === 'lte') return rowVal != null && String(rowVal) <= String(f.val)
          return true
        }),
      )
    }
    return c
  }
  const client = { from: (table: string) => chain(table) }
  return { supabaseAdmin: client }
})

import { GET } from './route'

describe('GET /api/cron/confirmations — team-confirm window must stay in ET, not real UTC instant', () => {
  beforeEach(() => {
    notificationInserts.length = 0
    sentSms.length = 0
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T08:00:00.000Z')) // 3am EST Jan 6
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still sends the team confirm request for a job starting in a couple hours ET', async () => {
    process.env.CRON_SECRET = 'test-secret'
    await GET(new Request('https://app.fullloop.example/api/cron/confirmations', {
      headers: { authorization: 'Bearer test-secret' },
    }))
    expect(sentSms.length).toBe(1)
    expect(sentSms[0].to).toBe('+15551234567')
    const req = notificationInserts.find((n) => n.type === 'team_confirm_request')
    expect(req).toBeDefined()
  })
})
