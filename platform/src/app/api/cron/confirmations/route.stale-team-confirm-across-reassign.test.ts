import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC'

/**
 * The "already confirmed" check for the hourly team-confirmation resend
 * matched on booking_id + start_time (fixed for reschedules in
 * route.stale-team-confirm-across-reschedule.test.ts), but not on WHICH
 * member confirmed. team-portal/jobs/reassign moves a job to a different
 * member without touching start_time (or booking_id) -- so a prior
 * confirmation from the OLD assignee was silently treated as covering the
 * NEW assignee too. The new member never gets the "please confirm" SMS, and
 * since no team_confirm_request ever gets sent for them, the 3-attempt
 * admin escalation can never fire either. Fixed by also requiring the
 * notification's metadata.team_member_id to match the booking's CURRENT
 * team_member_id.
 */

const TENANT = 'tenant-A'
const START = '2026-01-06T18:00:00.000Z' // unchanged by the reassign

const bookings: Record<string, unknown>[] = [
  {
    id: 'bk-reassigned', tenant_id: TENANT, status: 'scheduled', team_member_id: 'tm-new',
    start_time: START, end_time: '2026-01-06T19:00:00.000Z',
    clients: { name: 'Jane Client', address: '123 Main St' },
    team_members: { name: 'Cleaner Dana', phone: '+15559876543' },
  },
]

const notifications: Record<string, unknown>[] = [
  // Confirmation came from the PREVIOUS assignee (tm-old), same slot -- must not silence the resend for tm-new.
  { id: 'n-1', tenant_id: TENANT, booking_id: 'bk-reassigned', type: 'team_confirmed', created_at: '2026-01-04T10:00:00.000Z', metadata: { confirmed_start_time: START, team_member_id: 'tm-old' } },
]

const tenants: Record<string, unknown>[] = [
  { id: TENANT, name: 'Acme Cleaning', telnyx_api_key: 'key', telnyx_phone: '+15550000000', status: 'active' },
]

const sentSms: Record<string, unknown>[] = []
const notificationInserts: Record<string, unknown>[] = []

vi.mock('@/lib/secret-compare', () => ({ safeEqual: () => true }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async (args: Record<string, unknown>) => { sentSms.push(args); return {} }) }))
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
      insert: (row: Record<string, unknown>) => {
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

describe('GET /api/cron/confirmations — stale team confirmation must not survive a reassign', () => {
  beforeEach(() => {
    notificationInserts.length = 0
    sentSms.length = 0
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T08:00:00.000Z')) // 10h before START, well inside the 48h resend window
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resends the team confirm request to the newly-assigned member instead of treating the prior assignee\'s confirmation as still valid', async () => {
    process.env.CRON_SECRET = 'test-secret'
    await GET(new Request('https://app.fullloop.example/api/cron/confirmations', {
      headers: { authorization: 'Bearer test-secret' },
    }))
    expect(sentSms.length).toBe(1)
    expect(sentSms[0].to).toBe('+15559876543')
    const req = notificationInserts.find((n) => n.type === 'team_confirm_request')
    expect(req).toBeDefined()
    expect(req?.recipient_id).toBe('tm-new')
  })
})
