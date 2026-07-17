import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * GET /api/cron/confirmations — terminated-crew guard on the hourly team
 * confirmation-request resend (P1/W2 fresh-ground, same class as
 * cron/reminders' + cron/daily-summary's route.terminated-crew-guard.test.ts).
 *
 * Booking assignment survives HR termination (nothing unassigns a let-go
 * worker's existing future bookings). Before this fix, the team-member
 * confirmation loop resent "please confirm your job" hourly to whoever a
 * booking's team_member_id pointed at, with zero hr_status check — a fired
 * worker kept getting hourly confirm-request texts for jobs they no longer
 * work. Drives the REAL route + REAL getTerminatedTeamMemberIds against a
 * mocked supabaseAdmin.
 */

const TENANT_ID = 'tid-cron-confirmations'

let bookingsRows: Record<string, unknown>[] = []
let hrProfileRows: Record<string, unknown>[] = []
let notificationsRows: Record<string, unknown>[] = []

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({
    comms: { confirmation_reminder: { sms: true } },
  })),
}))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[], onInsert?: (row: Record<string, unknown>) => void) {
  return () => {
    const filters: Filter[] = []
    let limitN: number | undefined
    let order: { col: string; ascending: boolean } | undefined

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
      order: (col: string, opts?: { ascending?: boolean }) => { order = { col, ascending: opts?.ascending !== false }; return chain },
      limit: (n: number) => { limitN = n; return chain },
      returns: () => chain,
      insert: (row: Record<string, unknown>) => {
        onInsert?.(row)
        return { then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }
      },
      single: async () => {
        let hit = getRows().filter((r) => filters.every((f) => f(r)))
        if (order) hit = [...hit].sort((a, b) => {
          const av = new Date(a[order!.col] as string).getTime()
          const bv = new Date(b[order!.col] as string).getTime()
          return order!.ascending ? av - bv : bv - av
        })
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
          id: TENANT_ID, name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000',
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
  return new Request('http://t/api/cron/confirmations', { headers: { authorization: 'Bearer test-secret' } })
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

describe('cron/confirmations — hourly team confirm-request resend', () => {
  it('skips the terminated assignee, still texts the active one', async () => {
    const now = new Date()
    const soon = new Date(now.getTime() + 4 * 60 * 60 * 1000)

    bookingsRows = [
      {
        id: 'b-active', tenant_id: TENANT_ID, team_member_id: 'tm-active', status: 'scheduled',
        start_time: soon.toISOString(), end_time: soon.toISOString(),
        clients: { name: 'Alice', address: '1 Main St' },
        team_members: { name: 'Active Tom', phone: '+15550000001' },
      },
      {
        id: 'b-term', tenant_id: TENANT_ID, team_member_id: 'tm-terminated', status: 'scheduled',
        start_time: soon.toISOString(), end_time: soon.toISOString(),
        clients: { name: 'Bob', address: '2 Main St' },
        team_members: { name: 'Fired Fred', phone: '+15550000002' },
      },
    ]

    const res = await GET(req())
    expect(res.status).toBe(200)

    const smsTargets = sendSMSMock.mock.calls.map((c) => (c[0] as { to?: string }).to)
    expect(smsTargets).toContain('+15550000001')
    expect(smsTargets).not.toContain('+15550000002')
  })
})
