import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC' // route now derives ET hour/day boundaries via toNaiveET/naiveETDayRange; pin server TZ for a deterministic test

/**
 * `cron/reminders` gated its day-based reminders, thank-you emails, unpaid-
 * team alerts, and pending-booking alerts on `now.getHours() === 8` -- the
 * SERVER's local hour (UTC on Vercel), not ET. This fired the "8am" block at
 * 8am UTC (3am EST / 4am EDT) instead of 8am ET, texting clients about
 * tomorrow's appointment in the middle of the night. The day-range boundary
 * (`target`/`targetEnd` for the N-days-out query) was also built from the
 * SERVER's local (UTC) calendar day via `setDate`/`setHours` then
 * `.toISOString()`, compared against the naive-ET `start_time` column --
 * during the evening ET/UTC day-crossover the UTC calendar day is already
 * one ahead of ET, so the boundary could miss the intended booking entirely.
 * Fixed via `etHour` (real ET hour) and `naiveETDayRange` (naive-ET day
 * boundaries for the naive-ET start_time column).
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

// Booking exactly 1 day out from "tomorrow" in ET terms (2026-01-06, the ET
// calendar day after the test's fake-clock date).
const bookings: Row[] = [
  { id: 'bk-tomorrow-et', tenant_id: TENANT, status: 'scheduled', client_id: 'cl-1', team_member_id: null, service_type: 'Cleaning', start_time: '2026-01-06T14:00:00', end_time: '2026-01-06T16:00:00', clients: { name: 'Jane Client', phone: '+15551112222', email: null }, team_members: null },
]

const tenants: Row[] = [
  { id: TENANT, name: 'Acme Cleaning', telnyx_api_key: 'tk_test', telnyx_phone: '+15550000000', resend_api_key: null, status: 'active' },
]

const notificationInserts: Row[] = []
const smsSent: Row[] = []

vi.mock('@/lib/secret-compare', () => ({ safeEqual: () => true }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({})) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async (args: Row) => { smsSent.push(args); return {} }) }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(async () => ({})) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: async () => ({
    comms: {},
    timing: { reminder_days: [1], reminder_hours_before: [], review_delay_hours: 24, daily_summary_hour: 18, payment_reminder_hours: 24 },
  }),
}))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ reminder: () => 'reminder body' }) }))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', val: vals }); return c },
      is: () => c,
      not: () => c,
      lt: () => c,
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      lte: (col: string, val: unknown) => { filters.push({ col, op: 'lte', val }); return c },
      order: () => c,
      returns: () => c,
      single: () => Promise.resolve({ data: null, error: null }),
      limit: () => c,
      or: () => c,
      insert: (row: Row) => {
        if (table === 'notifications') notificationInserts.push(row)
        return Promise.resolve({ data: null, error: null })
      },
      then: (resolve: (v: { data: unknown; error: null; count?: number }) => unknown) => {
        const source = table === 'tenants' ? tenants : table === 'bookings' ? bookings : []
        const rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(rowVal)
            if (f.op === 'gte') return rowVal != null && String(rowVal) >= String(f.val)
            if (f.op === 'lte') return rowVal != null && String(rowVal) <= String(f.val)
            return true
          }),
        )
        return Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve)
      },
    }
    return c
  }
  const client = { from: (table: string) => chain(table) }
  return { supabaseAdmin: client }
})

import { GET } from './route'

describe('GET /api/cron/reminders — day-based reminder gate/boundary must use ET, not server-local (UTC)', () => {
  beforeEach(() => {
    notificationInserts.length = 0
    smsSent.length = 0
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does NOT fire the day-based block at 8am UTC (3am EST) -- only at 8am ET', async () => {
    // 2026-01-05T08:15:00Z = 3:15am EST -- UTC hour is 8, ET hour is 3.
    vi.setSystemTime(new Date('2026-01-05T08:15:00.000Z'))
    process.env.CRON_SECRET = 'test-secret'
    await GET(new Request('https://app.fullloop.example/api/cron/reminders', {
      headers: { authorization: 'Bearer test-secret' },
    }))
    expect(smsSent.length).toBe(0)
    expect(notificationInserts.find((n) => n.type === 'reminder_1day')).toBeUndefined()
  })

  it('fires the day-based block at 8am ET and finds the tomorrow-ET-boundary booking', async () => {
    // 2026-01-05T13:15:00Z = 8:15am EST -- real ET 8am gate.
    vi.setSystemTime(new Date('2026-01-05T13:15:00.000Z'))
    process.env.CRON_SECRET = 'test-secret'
    await GET(new Request('https://app.fullloop.example/api/cron/reminders', {
      headers: { authorization: 'Bearer test-secret' },
    }))
    expect(smsSent.length).toBe(1)
    expect(smsSent[0].to).toBe('+15551112222')
  })
})
