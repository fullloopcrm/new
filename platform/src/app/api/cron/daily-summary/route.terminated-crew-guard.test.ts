import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/cron/daily-summary — terminated-crew guard on the 3-day team
 * lookahead (P1/W2 fresh-ground, same class as cron/reminders'
 * route.terminated-crew-guard.test.ts).
 *
 * The team-member loop filtered `team_members.status = 'active'` only.
 * `team_members.status` and `hr_employee_profiles.hr_status` are two
 * independent fields — PATCH /api/dashboard/hr/[id] (HR termination) only
 * ever writes hr_status, never team_members.status. A just-fired employee
 * stays `status: 'active'` in team_members, so the pre-fix filter did nothing
 * to exclude them: they'd still get emailed/texted/pushed their next 3 days
 * of jobs. Drives the REAL route + REAL getTerminatedTeamMemberIds against a
 * mocked supabaseAdmin.
 */

const TENANT_ID = 'tid-cron-daily-summary'

let teamMembersRows: Record<string, unknown>[] = []
let hrProfileRows: Record<string, unknown>[] = []
let bookingsRows: Record<string, unknown>[] = []

const notifyMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (opts: Record<string, unknown>) => notifyMock(opts) }))

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))

vi.mock('@/lib/sms-templates', () => ({
  smsDailySummary: vi.fn(() => 'summary'),
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
      like: () => chain,
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
      then: (resolve: (v: { data: unknown; error: null; count?: number }) => void) => {
        let hit = getRows().filter((r) => filters.every((f) => f(r)))
        if (limitN != null) hit = hit.slice(0, limitN)
        resolve({ data: hit, error: null, count: hit.length })
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
      if (table === 'team_members') return makeTable(() => teamMembersRows)()
      if (table === 'hr_employee_profiles') return makeTable(() => hrProfileRows)()
      if (table === 'bookings') return makeTable(() => bookingsRows)()
      if (table === 'recurring_schedules') return makeTable(() => [])()
      return makeTable(() => [])()
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/daily-summary', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  notifyMock.mockClear()
  sendSMSMock.mockClear()

  // Both members are still `status: 'active'` in team_members -- HR
  // termination never touches that column, only hr_employee_profiles.
  teamMembersRows = [
    { id: 'tm-active', tenant_id: TENANT_ID, name: 'Active Tom', phone: '+15550000001', email: 'tom@x.com', status: 'active' },
    { id: 'tm-terminated', tenant_id: TENANT_ID, name: 'Fired Fred', phone: '+15550000002', email: 'fred@x.com', status: 'active' },
  ]
  hrProfileRows = [
    { tenant_id: TENANT_ID, team_member_id: 'tm-terminated', hr_status: 'terminated' },
    { tenant_id: TENANT_ID, team_member_id: 'tm-active', hr_status: 'active' },
  ]

  const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  bookingsRows = [
    {
      id: 'b-active', tenant_id: TENANT_ID, team_member_id: 'tm-active', status: 'confirmed',
      start_time: inTwoDays, end_time: inTwoDays, service_type: 'Clean',
      clients: { name: 'Alice', phone: null, address: null },
    },
    {
      id: 'b-term', tenant_id: TENANT_ID, team_member_id: 'tm-terminated', status: 'confirmed',
      start_time: inTwoDays, end_time: inTwoDays, service_type: 'Clean',
      clients: { name: 'Bob', phone: null, address: null },
    },
  ]
})

describe('cron/daily-summary — 3-day team lookahead', () => {
  it('skips the terminated assignee (even though team_members.status is still active), still notifies the active one', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)

    const teamSmsTo = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(teamSmsTo).toContain('+15550000001')
    expect(teamSmsTo).not.toContain('+15550000002')

    const teamNotifyIds = notifyMock.mock.calls
      .map((c) => c[0] as { recipientType?: string; recipientId?: string })
      .filter((o) => o.recipientType === 'team_member')
      .map((o) => o.recipientId)
    expect(teamNotifyIds).toContain('tm-active')
    expect(teamNotifyIds).not.toContain('tm-terminated')
  })
})
