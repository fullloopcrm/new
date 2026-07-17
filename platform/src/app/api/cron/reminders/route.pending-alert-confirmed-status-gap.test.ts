import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC' // route gates blocks on the real ET hour; pin server TZ so toNaiveET() is deterministic

/**
 * The 8am/2pm "PENDING BOOKING ALERTS" block (unassigned bookings needing
 * team assignment) only queried status IN ('pending', 'scheduled'). A
 * booking can go from unassigned -> client-confirmed without ever getting a
 * team member assigned: the day-before client confirmation text
 * (cron/confirmations) queries ['scheduled', 'confirmed'] with no
 * team_member_id requirement, and the client's YES reply
 * (webhooks/telnyx) flips status to 'confirmed' with no team_member_id
 * check either. So the exact case this alert exists to catch -- an
 * unassigned booking, now with the client expecting to be serviced -- went
 * silent the moment it got confirmed, right when it matters most. Fixed to
 * include 'confirmed' in the status filter.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  // Unassigned + confirmed -- must now alert (this is the gap).
  { id: 'bk-confirmed-unassigned', tenant_id: TENANT, status: 'confirmed', team_member_id: null, start_time: '2026-01-06T15:00:00.000Z', clients: { name: 'Jane Client' } },
  // Unassigned + scheduled -- already worked, must still alert.
  { id: 'bk-scheduled-unassigned', tenant_id: TENANT, status: 'scheduled', team_member_id: null, start_time: '2026-01-07T15:00:00.000Z', clients: { name: 'Sam Client' } },
  // Confirmed but assigned -- must NOT alert (nothing to do).
  { id: 'bk-confirmed-assigned', tenant_id: TENANT, status: 'confirmed', team_member_id: 'tm-1', start_time: '2026-01-06T16:00:00.000Z', clients: { name: 'Assigned Client' } },
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

describe('GET /api/cron/reminders — pending-assignment alert must not go blind once a booking is client-confirmed', () => {
  beforeEach(() => {
    notificationInserts.length = 0
    vi.useFakeTimers()
    // 8:15am EST Jan 5 = 13:15 UTC -- the route's pending-alert gate now
    // checks the real ET hour (etHour === 8), not the server-local (UTC) one.
    vi.setSystemTime(new Date('2026-01-05T13:15:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('alerts on unassigned bookings whether pending, scheduled, or already client-confirmed', async () => {
    process.env.CRON_SECRET = 'test-secret'
    await GET(new Request('https://app.fullloop.example/api/cron/reminders', {
      headers: { authorization: 'Bearer test-secret' },
    }))
    const pendingAlert = notificationInserts.find((n) => n.type === 'pending_reminder')
    expect(pendingAlert).toBeDefined()
    expect(pendingAlert?.message).toContain('2 bookings need team assignment')
    expect(pendingAlert?.message).toContain('Jane Client')
    expect(pendingAlert?.message).toContain('Sam Client')
    expect(pendingAlert?.message).not.toContain('Assigned Client')
  })
})
