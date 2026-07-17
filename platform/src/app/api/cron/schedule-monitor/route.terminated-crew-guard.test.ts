import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * GET /api/cron/schedule-monitor — terminated-employee detection (P1/W2 fresh
 * surface, same bug class as cron/reminders'/daily-summary's/late-check-in's/
 * confirmations' route.terminated-crew-guard.test.ts, but on the read/detect
 * side instead of the notify side).
 *
 * HR termination (dashboard/hr/[id] PATCH -> hr_status='terminated') never
 * touches a team member's existing FUTURE bookings/schedules, and team-portal
 * login is already blocked for terminated staff (team-portal-auth.ts) -- so
 * before this fix, a fired employee's future jobs sat "assigned" and
 * healthy-looking on the schedule with zero automated surfacing, even though
 * schedule-monitor already detects 13+ other issue types (day_off,
 * zone_mismatch, no_car, etc.). The job would silently go unstaffed until the
 * client complained or (NYC-Maid-only) the no_show check fired after the job
 * time had already passed. Drives the REAL route + REAL
 * getTerminatedTeamMemberIds against a mocked supabaseAdmin.
 */

const TENANT_ID = 'tid-schedule-monitor'
const OTHER_TENANT_ID = 'tid-other-tenant'

let bookingsRows: Record<string, unknown>[] = []
let hrProfileRows: Record<string, unknown>[] = []
let scheduleIssuesRows: Record<string, unknown>[] = []
const insertedIssues: Record<string, unknown>[] = []

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
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        let hit = getRows().filter((r) => filters.every((f) => f(r)))
        if (limitN != null) hit = hit.slice(0, limitN)
        resolve({ data: hit, error: null })
      },
    }
    if (onInsert) {
      chain.insert = (row: Record<string, unknown>) => {
        onInsert(row)
        return { then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }
      }
    }
    return chain
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return makeTable(() => [{ id: TENANT_ID, name: 'Acme Cleaning', status: 'active' }])()
      }
      if (table === 'bookings') return makeTable(() => bookingsRows)()
      if (table === 'hr_employee_profiles') return makeTable(() => hrProfileRows)()
      if (table === 'schedule_issues') {
        return makeTable(() => scheduleIssuesRows, (row) => insertedIssues.push(row))()
      }
      return makeTable(() => [])()
    },
  },
}))

vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/schedule-monitor', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  insertedIssues.length = 0
  scheduleIssuesRows = []
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cron/schedule-monitor — terminated employee still assigned', () => {
  it('flags a booking assigned to a terminated employee, not one assigned to an active employee', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-05T12:00:00.000Z')
    vi.setSystemTime(now)

    const future = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    const futureDate = future.toISOString().slice(0, 10)

    hrProfileRows = [
      { tenant_id: TENANT_ID, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { tenant_id: TENANT_ID, team_member_id: 'tm-active', hr_status: 'active' },
    ]

    bookingsRows = [
      {
        id: 'b-active', tenant_id: TENANT_ID, client_id: 'c-active', team_member_id: 'tm-active',
        start_time: `${futureDate}T09:00:00`, end_time: `${futureDate}T11:00:00`, status: 'scheduled',
        price: 10000, hourly_rate: 5000,
        clients: { id: 'c-active', name: 'Alice', address: '1 A St' },
        team_members: { id: 'tm-active', name: 'Active Tom' },
      },
      {
        id: 'b-term', tenant_id: TENANT_ID, client_id: 'c-term', team_member_id: 'tm-terminated',
        start_time: `${futureDate}T14:00:00`, end_time: `${futureDate}T16:00:00`, status: 'scheduled',
        price: 10000, hourly_rate: 5000,
        clients: { id: 'c-term', name: 'Bob', address: '2 B St' },
        team_members: { id: 'tm-terminated', name: 'Fired Fred' },
      },
    ]

    const res = await GET(req())
    expect(res.status).toBe(200)

    const termIssues = insertedIssues.filter((i) => i.type === 'terminated_assigned')
    expect(termIssues).toHaveLength(1)
    expect(termIssues[0]).toMatchObject({
      severity: 'critical',
      booking_id: 'b-term',
      team_member_id: 'tm-terminated',
      tenant_id: TENANT_ID,
    })
    expect(String(termIssues[0].message)).toContain('Fired Fred')
    expect(String(termIssues[0].message)).toContain('Bob')

    // The active member's booking must not be flagged terminated (nor left
    // unassigned -- it has a live, active assignee).
    expect(insertedIssues.some((i) => i.booking_id === 'b-active' && i.type === 'terminated_assigned')).toBe(false)
    expect(insertedIssues.some((i) => i.booking_id === 'b-active' && i.type === 'unassigned')).toBe(false)
  })

  it('wrong-tenant probe: a same-id member terminated in a DIFFERENT tenant must not flag this tenant\'s booking', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-08-05T12:00:00.000Z')
    vi.setSystemTime(now)

    const future = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    const futureDate = future.toISOString().slice(0, 10)

    // Same team_member_id value, terminated under a DIFFERENT tenant, active
    // under THIS tenant -- proves getTerminatedTeamMemberIds' tenant_id scope
    // isn't accidentally dropped.
    hrProfileRows = [
      { tenant_id: OTHER_TENANT_ID, team_member_id: 'tm-shared-id', hr_status: 'terminated' },
      { tenant_id: TENANT_ID, team_member_id: 'tm-shared-id', hr_status: 'active' },
    ]

    bookingsRows = [
      {
        id: 'b-shared', tenant_id: TENANT_ID, client_id: 'c-shared', team_member_id: 'tm-shared-id',
        start_time: `${futureDate}T09:00:00`, end_time: `${futureDate}T11:00:00`, status: 'scheduled',
        price: 10000, hourly_rate: 5000,
        clients: { id: 'c-shared', name: 'Carol', address: '3 C St' },
        team_members: { id: 'tm-shared-id', name: 'Shared Sam' },
      },
    ]

    const res = await GET(req())
    expect(res.status).toBe(200)

    expect(insertedIssues.some((i) => i.type === 'terminated_assigned')).toBe(false)
  })
})
