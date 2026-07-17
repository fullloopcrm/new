import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC' // route derives today's range via etMidnightUtc(); pin server TZ for a deterministic test

/**
 * The 9pm nightly digest's `todayStart`/`todayEnd` (compared against the
 * TIMESTAMPTZ `notifications.created_at` column) were built from the
 * SERVER's local (UTC) calendar day via `setHours(0,0,0,0)`/`setHours(23,59,
 * 59,999)` -- during the evening ET/UTC day-crossover window, UTC has
 * already rolled to the next calendar day while ET has not, so "today"
 * (UTC) missed notifications sent earlier in the real ET day. Fixed via
 * `etMidnightUtc`, which returns the correct real UTC instant for ET
 * midnight (unlike naive-ET day boundaries, this column IS timezone-aware,
 * so it needs a real UTC instant, not a naive-ET string).
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

// Notification sent earlier in the real ET day (2026-01-05 ET), but its
// TIMESTAMPTZ created_at instant is already into 2026-01-06 in UTC terms.
const notifications: Row[] = [
  { id: 'n-1', tenant_id: TENANT, type: 'booking_reminder', channel: 'sms', recipient_type: 'client', status: 'sent', created_at: '2026-01-06T02:00:00.000Z' }, // 9pm EST Jan 5
]

const tenants: Row[] = [
  { id: TENANT, name: 'Acme Cleaning', telnyx_api_key: null, telnyx_phone: null, resend_api_key: null, status: 'active' },
]

let digestNotified: Row | null = null

vi.mock('@/lib/secret-compare', () => ({ safeEqual: () => true }))
vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async (args: Row) => { if (args.type === 'daily_digest') digestNotified = args; return {} }),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({})) }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(async () => ({})) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: async () => ({
    comms: {},
    timing: { reminder_days: [], reminder_hours_before: [], review_delay_hours: 24, daily_summary_hour: 18, payment_reminder_hours: 24 },
  }),
}))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({}) }))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      in: () => c,
      is: () => c,
      not: (col: string, op: string, val: unknown) => { filters.push({ col, op: `not.${op}`, val }); return c },
      lt: () => c,
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      lte: (col: string, val: unknown) => { filters.push({ col, op: 'lte', val }); return c },
      order: () => c,
      returns: () => c,
      single: () => Promise.resolve({ data: null, error: null }),
      limit: () => c,
      or: () => c,
      insert: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: (v: { data: unknown; error: null; count?: number }) => unknown) => {
        const source = table === 'tenants' ? tenants : table === 'notifications' ? notifications : []
        const rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'gte') return rowVal != null && String(rowVal) >= String(f.val)
            if (f.op === 'lte') return rowVal != null && String(rowVal) <= String(f.val)
            if (f.op.startsWith('not.')) return true // "not type in (...)" exclusion list -- irrelevant to this fixture
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

describe('GET /api/cron/reminders — 9pm nightly digest day range must use real ET-midnight UTC instants', () => {
  beforeEach(() => {
    digestNotified = null
    vi.useFakeTimers()
    // 2026-01-06T02:15:00Z = 9:15pm EST Jan 5 -- ET hour 21, but UTC calendar
    // day has already rolled to Jan 6.
    vi.setSystemTime(new Date('2026-01-06T02:15:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('includes a notification sent earlier the same ET day, even though its UTC instant is already "tomorrow"', async () => {
    process.env.CRON_SECRET = 'test-secret'
    await GET(new Request('https://app.fullloop.example/api/cron/reminders', {
      headers: { authorization: 'Bearer test-secret' },
    }))
    expect(digestNotified).not.toBeNull()
    expect(digestNotified?.title).toContain('1 text')
  })
})
