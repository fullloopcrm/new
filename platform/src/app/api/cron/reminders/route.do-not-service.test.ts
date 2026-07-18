import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC' // route gates blocks on the real ET hour; pin server TZ so toNaiveET() is deterministic

/**
 * Both the day-based ("3 days before"/"tomorrow") and 2-hour-before client
 * SMS reminders in GET /api/cron/reminders call sendSMS() directly with no
 * sms_consent or do_not_service check -- the same class fixed for
 * confirmations/payment-reminder/payment-followup-daily/retention/
 * post-job-followup this session (a9c05b44) and the booking-lifecycle SMS
 * pipeline before that (89c2cdd9/14fa0888). This cron was not part of
 * either sweep and was still fully open: a client who'd replied STOP, or
 * one flagged do_not_service, still got the day-out and 2-hour reminder
 * texts. The email reminder in the same block goes through notify(), which
 * already gates centrally -- only the direct SMS (and the NYC Maid web-push
 * parity call, since do_not_service is documented as channel-agnostic in
 * notify.ts) needed the fix.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  // Day-based reminder window (3 days out from 2026-01-05 = 2026-01-08).
  {
    id: 'bk-day-dns', tenant_id: TENANT, status: 'scheduled', client_id: 'client-day-dns', team_member_id: 'tm-1',
    start_time: '2026-01-08T14:00:00', end_time: '2026-01-08T15:00:00', service_type: 'Standard Clean',
    clients: { name: 'DNS Dana', phone: '+15559990001', email: null, sms_consent: true, do_not_service: true },
    team_members: { name: 'Cleaner Chris' },
  },
  {
    id: 'bk-day-ok', tenant_id: TENANT, status: 'scheduled', client_id: 'client-day-ok', team_member_id: 'tm-2',
    start_time: '2026-01-08T15:00:00', end_time: '2026-01-08T16:00:00', service_type: 'Standard Clean',
    clients: { name: 'OK Olivia', phone: '+15559990002', email: null, sms_consent: true, do_not_service: false },
    team_members: { name: 'Cleaner Cara' },
  },
  {
    id: 'bk-day-stop', tenant_id: TENANT, status: 'scheduled', client_id: 'client-day-stop', team_member_id: 'tm-3',
    start_time: '2026-01-08T16:00:00', end_time: '2026-01-08T17:00:00', service_type: 'Standard Clean',
    clients: { name: 'Stopped Sam', phone: '+15559990003', email: null, sms_consent: false, do_not_service: false },
    team_members: { name: 'Cleaner Cara' },
  },
]

const tenants: Row[] = [
  { id: TENANT, name: 'Acme Cleaning', telnyx_api_key: 'key', telnyx_phone: '+15550000000', resend_api_key: null, status: 'active' },
]

const sentSms: Row[] = []
const pushed: Row[] = []
const notificationInserts: Row[] = []

vi.mock('@/lib/secret-compare', () => ({ safeEqual: () => true }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({})) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async (args: Row) => { sentSms.push(args); return {} }) }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(async (clientId: string) => { pushed.push({ clientId }); return {} }) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => true }))
vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: async () => ({
    comms: {},
    timing: { reminder_days: [3], reminder_hours_before: [2], review_delay_hours: 24, daily_summary_hour: 18, payment_reminder_hours: 24 },
  }),
}))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ reminder: () => 'Reminder text' }) }))

vi.mock('@/lib/supabase', () => {
  const notifications: Row[] = []
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
      single: () => Promise.resolve({ data: null, error: null }),
      limit: () => c,
      or: () => c,
      insert: (row: Row) => {
        if (table === 'notifications') notificationInserts.push(row)
        return Promise.resolve({ data: null, error: null })
      },
      then: (resolve: (v: { data: unknown; error: null; count?: number }) => unknown) => {
        const source = table === 'tenants' ? tenants : table === 'bookings' ? bookings : table === 'notifications' ? notifications : []
        const rows = source.filter((row) =>
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
        return Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve)
      },
    }
    return c
  }
  const client = { from: (table: string) => chain(table) }
  return { supabaseAdmin: client }
})

import { GET } from './route'

describe('GET /api/cron/reminders — do_not_service / sms_consent gate on direct client SMS + push', () => {
  beforeEach(() => {
    notificationInserts.length = 0
    sentSms.length = 0
    pushed.length = 0
    vi.useFakeTimers()
    // 8:15am EST Jan 5 2026 = 13:15 UTC -- lands in the day-based 8am reminder gate,
    // 3 days before the 2026-01-08 bookings above.
    vi.setSystemTime(new Date('2026-01-05T13:15:00.000Z'))
    process.env.CRON_SECRET = 'test-secret'
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not text or push a client flagged do_not_service, does not text a STOP client, but still notifies an eligible client', async () => {
    await GET(new Request('https://app.fullloop.example/api/cron/reminders', {
      headers: { authorization: 'Bearer test-secret' },
    }))

    const texted = sentSms.map((s) => s.to)
    expect(texted).not.toContain('+15559990001') // do_not_service
    expect(texted).not.toContain('+15559990003') // sms_consent: false
    expect(texted).toContain('+15559990002') // eligible

    const pushedIds = pushed.map((p) => p.clientId)
    expect(pushedIds).not.toContain('client-day-dns')
    expect(pushedIds).toContain('client-day-ok')
    // sms_consent:false alone (no do_not_service) doesn't gate push -- push has
    // no SMS-style opt-out channel, only the do_not_service kill-switch applies.
    expect(pushedIds).toContain('client-day-stop')
  })
})
