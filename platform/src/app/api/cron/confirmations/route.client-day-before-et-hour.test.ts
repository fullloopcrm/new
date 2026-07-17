import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * The client day-before confirmation was gated on `now.getHours() === 13`,
 * which reads the SERVER's local hour (UTC on Vercel) -- not ET. It fired
 * at 1pm UTC (8am EST), 5 hours before the intended 1pm ET. tomorrowStart/
 * End were also built via server-local setDate/setHours then compared
 * against the naive-ET start_time column -- the SAME day-boundary bug
 * class as elsewhere this session, compounding the hour bug.
 *
 * Fake clock: 2026-01-05T18:00:00Z = 1pm EST Jan 5 (the real intended
 * trigger instant). A booking tomorrow (ET) at 2pm ET Jan 6 must get the
 * day-before confirmation sent at THIS instant, not at 8am EST.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  {
    id: 'bk-tomorrow', tenant_id: TENANT, status: 'scheduled', client_id: 'client-1', team_member_id: 'tm-1',
    start_time: '2026-01-06T14:00:00', service_type: 'Standard Clean', // naive ET, tomorrow (ET) 2pm
    clients: { name: 'Jane Client', phone: '+15559998888' },
    team_members: { name: 'Cleaner Chris' },
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

describe('GET /api/cron/confirmations — client day-before must gate on ET hour/day, not server-local', () => {
  beforeEach(() => {
    notificationInserts.length = 0
    sentSms.length = 0
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-05T18:00:00.000Z')) // 1pm EST Jan 5
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends the day-before client confirmation at 1pm ET for a booking tomorrow (ET)', async () => {
    process.env.CRON_SECRET = 'test-secret'
    await GET(new Request('https://app.fullloop.example/api/cron/confirmations', {
      headers: { authorization: 'Bearer test-secret' },
    }))
    expect(sentSms.length).toBe(1)
    expect(sentSms[0].to).toBe('+15559998888')
    const req = notificationInserts.find((n) => n.type === 'client_confirm_request')
    expect(req).toBeDefined()
  })
})
