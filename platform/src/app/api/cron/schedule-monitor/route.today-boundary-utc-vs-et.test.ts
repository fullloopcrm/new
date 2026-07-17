import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

process.env.TZ = 'UTC' // pin the harness's own local tz; the bug is the ROUTE reading server-local (UTC) instead of ET

/**
 * bookings.start_time/end_time are stored naive-ET (no tz) -- exactly what
 * the operator typed in, e.g. "2026-01-05T22:00:00" means 10pm ET, literally.
 * The route built "today" via `new Date().getFullYear()/getMonth()/getDate()`,
 * which read the SERVER's local calendar. On Vercel that's UTC, which runs a
 * full calendar day ahead of ET for ~4-5h every evening (8pm-midnight ET,
 * winter EST is UTC-5). During that window the `.gte('start_time', todayStr)`
 * lower bound silently excluded the rest of TODAY's (ET) bookings from every
 * issue check this cron runs -- time conflicts, duplicate-client, day-off,
 * zone mismatch, unassigned, no-car -- right when the day still has real
 * bookings left to catch problems on.
 *
 * Real time in this test: 2026-01-06T02:00:00Z = Jan 5, 2026, 9:00pm EST.
 * A booking unassigned for Jan 5 at 10pm ET (1hr in the future, same ET day)
 * must still be scanned and flagged.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

const bookings: Row[] = [
  {
    id: 'bk-unassigned-tonight',
    tenant_id: TENANT,
    client_id: 'client-1',
    team_member_id: null,
    start_time: '2026-01-05T22:00:00', // naive ET, 10pm -- still upcoming relative to 9pm ET "now"
    end_time: '2026-01-05T23:00:00',
    status: 'scheduled',
    price: 10000,
    hourly_rate: 50,
    notes: null,
    recurring_type: null,
    actual_hours: null,
    clients: { id: 'client-1', name: 'Evening Client', address: null },
    team_members: null,
  },
]

const tenants: Row[] = [{ id: TENANT, name: 'Acme Cleaning', status: 'active' }]

const scheduleIssueInserts: Row[] = []

vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', val: vals }); return c },
      is: (col: string, val: unknown) => { filters.push({ col, op: 'is', val }); return c },
      not: () => c,
      lt: (col: string, val: unknown) => { filters.push({ col, op: 'lt', val }); return c },
      gt: (col: string, val: unknown) => { filters.push({ col, op: 'gt', val }); return c },
      neq: (col: string, val: unknown) => { filters.push({ col, op: 'neq', val }); return c },
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      lte: (col: string, val: unknown) => { filters.push({ col, op: 'lte', val }); return c },
      or: () => c,
      order: () => c,
      limit: () => c,
      insert: (row: Row) => {
        if (table === 'schedule_issues') scheduleIssueInserts.push(row)
        return Promise.resolve({ data: null, error: null })
      },
      update: () => c,
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
        const source = table === 'tenants' ? tenants : table === 'bookings' ? bookings : []
        const rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(rowVal)
            if (f.op === 'is') return rowVal === f.val
            if (f.op === 'lt') return rowVal != null && String(rowVal) < String(f.val)
            if (f.op === 'gt') return rowVal != null && String(rowVal) > String(f.val)
            if (f.op === 'neq') return rowVal !== f.val
            if (f.op === 'gte') return rowVal != null && String(rowVal) >= String(f.val)
            if (f.op === 'lte') return rowVal != null && String(rowVal) <= String(f.val)
            return true
          }),
        )
        return Promise.resolve({ data: rows, error: null }).then(resolve)
      },
    }
    return c
  }
  const client = { from: (table: string) => chain(table) }
  return { supabaseAdmin: client }
})

import { GET } from './route'

describe('GET /api/cron/schedule-monitor — today boundary must use ET, not server-UTC', () => {
  beforeEach(() => {
    scheduleIssueInserts.length = 0
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T02:00:00.000Z')) // 9pm ET Jan 5 -- UTC calendar already Jan 6
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still scans and flags a same-ET-day unassigned booking scheduled later tonight', async () => {
    process.env.CRON_SECRET = 'test-secret'
    await GET(new Request('https://app.fullloop.example/api/cron/schedule-monitor', {
      headers: { authorization: 'Bearer test-secret' },
    }))
    const unassignedIssue = scheduleIssueInserts.find((i) => i.type === 'unassigned' && i.booking_id === 'bk-unassigned-tonight')
    expect(unassignedIssue).toBeDefined()
  })
})
