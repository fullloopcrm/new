import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * The "already confirmed" check for the hourly team-confirmation resend
 * only asked "does ANY team_confirmed notification exist for this
 * booking_id" — with no regard to start_time. A reschedule (client- or
 * admin-initiated) keeps the same booking_id and just updates start_time,
 * so a team member who confirmed the OLD slot was silently treated as
 * having confirmed the NEW one too, and never got asked again — even
 * though they never saw or agreed to the new time. Fixed by stamping
 * confirmed_start_time in the team_confirmed notification's metadata
 * (webhooks/telnyx) and only honoring it here when it matches the
 * booking's current start_time.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const OLD_START = '2026-01-05T15:00:00.000Z'
const NEW_START = '2026-01-06T18:00:00.000Z' // booking was rescheduled to this

const bookings: Row[] = [
  {
    id: 'bk-rescheduled', tenant_id: TENANT, status: 'scheduled', team_member_id: 'tm-1',
    start_time: NEW_START, end_time: '2026-01-06T19:00:00.000Z',
    clients: { name: 'Jane Client', address: '123 Main St' },
    team_members: { name: 'Cleaner Chris', phone: '+15551234567' },
  },
]

const notifications: Row[] = [
  // Confirmation was for the OLD slot — must not silence the resend for NEW_START.
  { id: 'n-1', tenant_id: TENANT, booking_id: 'bk-rescheduled', type: 'team_confirmed', created_at: '2026-01-04T10:00:00.000Z', metadata: { confirmed_start_time: OLD_START } },
]

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

describe('GET /api/cron/confirmations — stale team confirmation must not survive a reschedule', () => {
  beforeEach(() => {
    notificationInserts.length = 0
    sentSms.length = 0
    vi.useFakeTimers()
    // 10 hours before NEW_START, well inside the 48h resend window; hour !== 13 so the client day-before block is skipped.
    vi.setSystemTime(new Date('2026-01-06T08:00:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resends the team confirm request for the new slot instead of treating the old confirmation as still valid', async () => {
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
