import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC' // route gates blocks on now.getHours() in server-local time; pin it for a deterministic test

/**
 * The 8am "UNPAID TEAM ALERTS" block read the legacy `team_paid` column,
 * but that column is only ever written from one place (the dashboard
 * booking-detail "Mark Team Paid" button). Every other real payment path --
 * admin cleaner-payout, the Stripe payout webhook, and finance/mark-paid's
 * individual "pay team" action -- writes `team_member_paid` instead and
 * never touches `team_paid`. So a booking paid through any of those three
 * (the majority of real payouts) still read team_paid as null and got
 * flagged "unpaid team" forever, false-alerting admins on jobs that were
 * genuinely already paid. Fixed to check `team_member_paid`, the field
 * every real write path (and the payroll claim query) actually uses.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  // Genuinely unpaid -- must still alert.
  { id: 'bk-real-unpaid', tenant_id: TENANT, status: 'completed', end_time: '2025-12-01T10:00:00.000Z', team_member_paid: false, team_paid: null },
  // Paid via cleaner-payout (writes team_member_paid only) -- must NOT alert.
  { id: 'bk-paid-via-cleaner-payout', tenant_id: TENANT, status: 'completed', end_time: '2025-12-02T10:00:00.000Z', team_member_paid: true, team_paid: null },
]

const tenants: Row[] = [
  { id: TENANT, name: 'Acme Cleaning', telnyx_api_key: null, telnyx_phone: null, resend_api_key: null, status: 'active' },
]

const notificationInserts: Row[] = []

vi.mock('@/lib/secret-compare', () => ({ safeEqual: () => true }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({})) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({})) }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(async () => ({})) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: async () => ({
    comms: {},
    timing: { reminder_days: [3, 1], reminder_hours_before: [2], review_delay_hours: 24, daily_summary_hour: 18, payment_reminder_hours: 24 },
  }),
}))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({}) }))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    let orParts: Array<{ col: string; op: string; val: string }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', val: vals }); return c },
      is: (col: string, val: unknown) => { filters.push({ col, op: 'is', val }); return c },
      not: () => c,
      lt: (col: string, val: unknown) => { filters.push({ col, op: 'lt', val }); return c },
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      lte: (col: string, val: unknown) => { filters.push({ col, op: 'lte', val }); return c },
      order: () => c,
      returns: () => c,
      single: () => Promise.resolve({ data: null, error: null }),
      limit: () => c,
      or: (clause: string) => {
        orParts = clause.split(',').map((part) => {
          const [col, op, val] = part.split('.')
          return { col, op, val }
        })
        return c
      },
      insert: (row: Row) => {
        if (table === 'notifications') notificationInserts.push(row)
        return Promise.resolve({ data: null, error: null })
      },
      then: (resolve: (v: { data: unknown; error: null; count?: number }) => unknown) => {
        const source = table === 'tenants' ? tenants : table === 'bookings' ? bookings : []
        let rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(rowVal)
            if (f.op === 'is') return rowVal === f.val
            if (f.op === 'lt') return rowVal != null && String(rowVal) < String(f.val)
            if (f.op === 'gte') return rowVal != null && String(rowVal) >= String(f.val)
            if (f.op === 'lte') return rowVal != null && String(rowVal) <= String(f.val)
            return true
          }),
        )
        if (orParts.length > 0) {
          rows = rows.filter((row) =>
            orParts.some((p) => {
              const rowVal = row[p.col]
              if (p.op === 'is') return p.val === 'null' ? rowVal == null : rowVal === (p.val === 'true')
              if (p.op === 'eq') return rowVal === (p.val === 'true')
              return false
            }),
          )
        }
        return Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve)
      },
    }
    return c
  }
  const client = { from: (table: string) => chain(table) }
  return { supabaseAdmin: client }
})

import { GET } from './route'

describe('GET /api/cron/reminders — unpaid-team alert must not read the stale team_paid field', () => {
  beforeEach(() => {
    notificationInserts.length = 0
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-05T08:15:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not false-alert on a booking already paid via cleaner-payout/Stripe/mark-paid', async () => {
    process.env.CRON_SECRET = 'test-secret'
    await GET(new Request('https://app.fullloop.example/api/cron/reminders', {
      headers: { authorization: 'Bearer test-secret' },
    }))
    const unpaidTeamAlert = notificationInserts.find((n) => n.type === 'unpaid_team')
    expect(unpaidTeamAlert).toBeDefined()
    expect(unpaidTeamAlert?.message).toBe('1 completed job with unpaid team')
  })
})
