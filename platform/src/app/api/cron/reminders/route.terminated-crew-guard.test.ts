import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * GET /api/cron/reminders — terminated-crew guard on team-member texts
 * (P1/W2 fresh-ground, same class as the already-fixed find-cleaner/bookings
 * broadcast + dispatch-route/batch-update/regenerate assignment guards).
 *
 * HR-terminating a team member (PATCH /api/dashboard/hr/[id]) never unassigns
 * them from bookings already on the calendar — nothing clears
 * bookings.team_member_id on termination. Before this fix, both the
 * day-before and the hour-before reminder passes texted whoever a booking's
 * team_member_id pointed at, with zero hr_status check, so a fired worker
 * kept getting "Job Tomorrow" / "Job in N hours" texts for jobs assigned
 * before they were let go.
 *
 * Drives the REAL route + the REAL getTerminatedTeamMemberIds (against a
 * mocked supabaseAdmin), not a reimplementation.
 */

const TENANT_ID = 'tid-cron-reminders'

let bookingsRows: Record<string, unknown>[] = []
let hrProfileRows: Record<string, unknown>[] = []

const notifyMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (opts: Record<string, unknown>) => notifyMock(opts) }))

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({
    timing: { reminder_days: [1], reminder_hours_before: [2] },
    comms: { booking_reminder: { sms: true } },
  })),
}))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: vi.fn(async () => ({ reminder: () => 'client reminder text' })),
}))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    let limitN: number | undefined

    const dateCmp = (col: string, val: unknown, cmp: (a: number, b: number) => boolean): Filter =>
      (r) => cmp(new Date(r[col] as string).getTime(), new Date(val as string).getTime())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return chain },
      in: (col: string, val: unknown[]) => { filters.push((r) => val.includes(r[col])); return chain },
      is: (col: string, val: unknown) => {
        filters.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] === val))
        return chain
      },
      gte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a >= b)); return chain },
      lte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a <= b)); return chain },
      gt: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a > b)); return chain },
      lt: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a < b)); return chain },
      not: () => chain,
      or: () => chain,
      order: () => chain,
      limit: (n: number) => { limitN = n; return chain },
      returns: () => chain,
      insert: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
      single: async () => {
        const hit = getRows().filter((r) => filters.every((f) => f(r)))
        return hit.length ? { data: hit[0], error: null } : { data: null, error: { code: 'PGRST116' } }
      },
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        let hit = getRows().filter((r) => filters.every((f) => f(r)))
        if (limitN != null) hit = hit.slice(0, limitN)
        resolve({ data: hit, error: null })
      },
    }
    return chain
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return makeTable(() => [{
          id: TENANT_ID, name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', resend_api_key: null,
        }])()
      }
      if (table === 'bookings') return makeTable(() => bookingsRows)()
      if (table === 'hr_employee_profiles') return makeTable(() => hrProfileRows)()
      return makeTable(() => [])()
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/reminders', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  notifyMock.mockClear()
  sendSMSMock.mockClear()
  hrProfileRows = [
    { tenant_id: TENANT_ID, team_member_id: 'tm-terminated', hr_status: 'terminated' },
    { tenant_id: TENANT_ID, team_member_id: 'tm-active', hr_status: 'active' },
  ]
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cron/reminders — day-before team reminder', () => {
  it('skips the terminated assignee, still texts the active one', async () => {
    vi.useFakeTimers()
    const now = new Date()
    now.setHours(8, 0, 0, 0) // day-based reminders only fire at local hour 8
    vi.setSystemTime(now)

    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)

    bookingsRows = [
      {
        id: 'b-active', tenant_id: TENANT_ID, client_id: 'c1', team_member_id: 'tm-active', service_type: 'Clean',
        status: 'confirmed', start_time: tomorrow.toISOString(), end_time: tomorrow.toISOString(),
        clients: { name: 'Alice', phone: null, email: null },
        team_members: { name: 'Active Tom', phone: '+15550000001', email: 'tom@x.com' },
      },
      {
        id: 'b-term', tenant_id: TENANT_ID, client_id: 'c2', team_member_id: 'tm-terminated', service_type: 'Clean',
        status: 'confirmed', start_time: tomorrow.toISOString(), end_time: tomorrow.toISOString(),
        clients: { name: 'Bob', phone: null, email: null },
        team_members: { name: 'Fired Fred', phone: '+15550000002', email: 'fred@x.com' },
      },
    ]

    const res = await GET(req())
    expect(res.status).toBe(200)

    const teamNotifyCalls = notifyMock.mock.calls
      .map((c) => c[0] as { recipientType?: string; recipientId?: string })
      .filter((o) => o.recipientType === 'team_member')

    expect(teamNotifyCalls.some((o) => o.recipientId === 'tm-active')).toBe(true)
    expect(teamNotifyCalls.some((o) => o.recipientId === 'tm-terminated')).toBe(false)
  })
})

describe('cron/reminders — hour-before team reminder', () => {
  it('skips the terminated assignee, still texts the active one', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-05T12:00:00.000Z')
    vi.setSystemTime(now)

    // reminder_hours_before is mocked to [2] -> window is [now+2h floored to
    // the hour, +59:59.999]
    const soon = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    soon.setMinutes(30, 0, 0)

    bookingsRows = [
      {
        id: 'b-active-2h', tenant_id: TENANT_ID, client_id: 'c1', team_member_id: 'tm-active', service_type: 'Clean',
        status: 'confirmed', start_time: soon.toISOString(),
        clients: { name: 'Alice', phone: '+15551110000', email: null },
        team_members: { name: 'Active Tom', phone: '+15550000001' },
      },
      {
        id: 'b-term-2h', tenant_id: TENANT_ID, client_id: 'c2', team_member_id: 'tm-terminated', service_type: 'Clean',
        status: 'confirmed', start_time: soon.toISOString(),
        clients: { name: 'Bob', phone: '+15552220000', email: null },
        team_members: { name: 'Fired Fred', phone: '+15550000002' },
      },
    ]

    const res = await GET(req())
    expect(res.status).toBe(200)

    const teamPhones = sendSMSMock.mock.calls
      .map((c) => (c[0] as { to?: string }).to)
      .filter((to) => to === '+15550000001' || to === '+15550000002')

    expect(teamPhones).toContain('+15550000001')
    expect(teamPhones).not.toContain('+15550000002')
  })
})
