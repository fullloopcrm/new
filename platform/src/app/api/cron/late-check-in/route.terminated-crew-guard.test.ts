import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * GET /api/cron/late-check-in — terminated-crew guard on the team-facing
 * late check-in / late check-out texts (P1/W2 fresh-ground, same class as
 * cron/reminders' + cron/daily-summary's + cron/confirmations'
 * route.terminated-crew-guard.test.ts).
 *
 * Booking assignment survives HR termination (nothing unassigns a let-go
 * worker's existing future bookings). Before this fix, both the late
 * check-in and late check-out passes texted whoever a booking's
 * team_member_id pointed at with zero hr_status check, so a fired worker
 * kept getting "you haven't checked in/out" texts for jobs they no longer
 * work. Drives the REAL route + REAL getTerminatedTeamMemberIds against a
 * mocked supabaseAdmin. Admin-facing SMS/push are intentionally untouched
 * (admin should still know a stale-assigned job is unmanned) — only the
 * team-member text is guarded.
 */

const TENANT_ID = 'tid-cron-late-check-in'

let bookingsRows: Record<string, unknown>[] = []
let hrProfileRows: Record<string, unknown>[] = []
let notificationsRows: Record<string, unknown>[] = []

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => Promise.resolve(sendSMSMock(opts)) }))

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({
    comms: { team_late_alert: { sms: true }, owner_late_alert: { sms: true } },
  })),
}))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-templates', () => ({
  smsLateCheckInTeam: () => 'late check-in team text',
  smsLateCheckInAdmin: () => 'late check-in admin text',
  smsLateCheckOutTeam: () => 'late check-out team text',
  smsLateCheckOutAdmin: () => 'late check-out admin text',
}))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[], onInsert?: (row: Record<string, unknown>) => void) {
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
        filters.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] !== null && r[col] !== undefined))
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
      insert: (row: Record<string, unknown>) => {
        onInsert?.(row)
        return { then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }
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
          id: TENANT_ID, name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', owner_phone: '+15551234567', phone: null,
        }])()
      }
      if (table === 'bookings') return makeTable(() => bookingsRows)()
      if (table === 'hr_employee_profiles') return makeTable(() => hrProfileRows)()
      if (table === 'notifications') return makeTable(() => notificationsRows, (row) => notificationsRows.push(row))()
      return makeTable(() => [])()
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/late-check-in', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  sendSMSMock.mockClear()
  notificationsRows = []
  hrProfileRows = [
    { tenant_id: TENANT_ID, team_member_id: 'tm-terminated', hr_status: 'terminated' },
    { tenant_id: TENANT_ID, team_member_id: 'tm-active', hr_status: 'active' },
  ]
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cron/late-check-in — late check-in team text', () => {
  it('skips the terminated assignee, still texts the active one', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-05T12:00:00.000Z')
    vi.setSystemTime(now)

    const startedAgo = new Date(now.getTime() - 15 * 60 * 1000) // 15 min ago -> past the 10-min-late threshold

    bookingsRows = [
      {
        id: 'b-active', tenant_id: TENANT_ID, team_member_id: 'tm-active', status: 'scheduled',
        start_time: startedAgo.toISOString(), check_in_time: null,
        clients: { name: 'Alice', phone: '+15551110000' },
        team_members: { name: 'Active Tom', phone: '+15550000001' },
      },
      {
        id: 'b-term', tenant_id: TENANT_ID, team_member_id: 'tm-terminated', status: 'scheduled',
        start_time: startedAgo.toISOString(), check_in_time: null,
        clients: { name: 'Bob', phone: '+15552220000' },
        team_members: { name: 'Fired Fred', phone: '+15550000002' },
      },
    ]

    const res = await GET(req())
    expect(res.status).toBe(200)

    const smsTargets = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(smsTargets).toContain('+15550000001')
    expect(smsTargets).not.toContain('+15550000002')
    // Admin still gets alerted either way — only the team text is guarded.
    expect(smsTargets).toContain('+15551234567')
  })
})

describe('cron/late-check-in — late check-out team text', () => {
  it('skips the terminated assignee, still texts the active one', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-05T12:00:00.000Z')
    vi.setSystemTime(now)

    const alertedAgo = new Date(now.getTime() - 40 * 60 * 1000) // past the 30-min-since-alert threshold

    bookingsRows = [
      {
        id: 'b-active-out', tenant_id: TENANT_ID, team_member_id: 'tm-active', status: 'in_progress',
        start_time: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        fifteen_min_alert_time: alertedAgo.toISOString(), check_out_time: null,
        clients: { name: 'Alice', phone: '+15551110000' },
        team_members: { name: 'Active Tom', phone: '+15550000001' },
      },
      {
        id: 'b-term-out', tenant_id: TENANT_ID, team_member_id: 'tm-terminated', status: 'in_progress',
        start_time: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        fifteen_min_alert_time: alertedAgo.toISOString(), check_out_time: null,
        clients: { name: 'Bob', phone: '+15552220000' },
        team_members: { name: 'Fired Fred', phone: '+15550000002' },
      },
    ]

    const res = await GET(req())
    expect(res.status).toBe(200)

    const smsTargets = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(smsTargets).toContain('+15550000001')
    expect(smsTargets).not.toContain('+15550000002')
    expect(smsTargets).toContain('+15551234567')
  })
})
