import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The route's "apply to the materialized booking" step reads the target
 * booking(s) with `.in('status', ['scheduled','pending','confirmed'])`, then
 * loops and skip-deletes / moves / reassigns each one with NO matching status
 * filter on the write itself -- only `.eq('id', ...)`. A concurrent status
 * change landing in the gap between that SELECT and the write (a team member
 * checking in, or a check-out auto-completing the booking) is invisible to
 * the write: an admin recording a "skip" exception could delete a booking
 * that has already started (losing check-in time / the whole record), and
 * "move"/"reassign" could silently retarget a job that's actively in
 * progress.
 *
 * Simulates the race organically: the fake DB's SELECT step mutates the
 * underlying row (standing in for a concurrent checkin/checkout) as a side
 * effect of returning the pre-loop snapshot, then the route's own
 * delete/update attempts to act on that now-stale row. Proves the write's
 * own `.in('status', ...)` re-check, not just the earlier read, is what
 * actually stops it.
 */

const TENANT_A = 'tenant-A'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const raceFlip: { mutate: ((row: Row) => void) | null } = { mutate: null }

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  let payload: Row = {}
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const resolveList = (): { data: Row[] | null; error: null } => {
    if (op === 'select') {
      const rows = matched()
      if (table === 'bookings' && raceFlip.mutate) {
        for (const r of rows) raceFlip.mutate(r)
        raceFlip.mutate = null
      }
      return { data: rows.map((r) => ({ ...r })), error: null }
    }
    if (op === 'upsert') {
      const row = { ...payload }
      DB[table] = [...rowsOf(), row]
      return { data: [row], error: null }
    }
    if (op === 'delete') {
      const toDelete = matched()
      DB[table] = rowsOf().filter((r) => !toDelete.includes(r))
      return { data: toDelete.map((r) => ({ id: r.id })), error: null }
    }
    if (op === 'update') {
      const rows = matched()
      for (const r of rows) Object.assign(r, payload)
      return { data: rows.map((r) => ({ id: r.id })), error: null }
    }
    return { data: null, error: null }
  }
  const c: Record<string, unknown> = {
    select: () => c,
    insert: (p: Row) => { op = 'insert'; payload = p; return c },
    update: (p: Row) => { op = 'update'; payload = p; return c },
    delete: () => { op = 'delete'; return c },
    upsert: (p: Row) => { op = 'upsert'; payload = p; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) >= (val as string)); return c },
    lte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) <= (val as string)); return c },
    single: async () => {
      const row = matched()[0]
      if (!row) return { data: null, error: { message: 'not found' } }
      return { data: { ...row }, error: null }
    },
    maybeSingle: async () => {
      const row = matched()[0]
      return { data: row ? { ...row } : null, error: null }
    },
    then: (resolve: (v: { data: Row[] | null; error: null }) => void) => { resolve(resolveList()) },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

import { POST } from './route'

beforeEach(() => {
  DB.recurring_schedules = [{ id: 'sch-1', tenant_id: TENANT_A, duration_hours: 3 }]
  DB.team_members = [{ id: 'tm-new', tenant_id: TENANT_A, name: 'New Assignee' }]
  DB.recurring_exceptions = []
  DB.bookings = []
  raceFlip.mutate = null
})

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('POST /api/admin/recurring-schedules/:id/exception — atomic race guard', () => {
  it('skip: leaves an already-started booking alone when check-in lands between the read and the delete', async () => {
    DB.bookings.push({
      id: 'bk-race', tenant_id: TENANT_A, schedule_id: 'sch-1',
      status: 'scheduled', start_time: '2026-08-01T09:00:00',
    })
    raceFlip.mutate = (row) => { row.status = 'in_progress' }

    const res = await POST(req({ occurrence_date: '2026-08-01', type: 'skip' }), params('sch-1'))
    const json = await res.json()

    expect(json.bookings_updated).toBe(0)
    const row = DB.bookings.find((r) => r.id === 'bk-race')
    expect(row).toBeDefined()
    expect(row?.status).toBe('in_progress')
  })

  it('skip control: still deletes when nothing races', async () => {
    DB.bookings.push({
      id: 'bk-race', tenant_id: TENANT_A, schedule_id: 'sch-1',
      status: 'scheduled', start_time: '2026-08-01T09:00:00',
    })

    const res = await POST(req({ occurrence_date: '2026-08-01', type: 'skip' }), params('sch-1'))
    const json = await res.json()

    expect(json.bookings_updated).toBe(1)
    expect(DB.bookings.find((r) => r.id === 'bk-race')).toBeUndefined()
  })

  it('reassign: leaves an in-progress booking\'s team_member_id alone when checkout lands between the read and the update', async () => {
    DB.bookings.push({
      id: 'bk-race', tenant_id: TENANT_A, schedule_id: 'sch-1',
      status: 'scheduled', start_time: '2026-08-01T09:00:00', team_member_id: 'tm-original',
    })
    raceFlip.mutate = (row) => { row.status = 'completed' }

    const res = await POST(
      req({ occurrence_date: '2026-08-01', type: 'reassign', new_team_member_id: 'tm-new' }),
      params('sch-1'),
    )
    const json = await res.json()

    expect(json.bookings_updated).toBe(0)
    expect(DB.bookings.find((r) => r.id === 'bk-race')?.team_member_id).toBe('tm-original')
  })

  it('reassign control: still reassigns when nothing races', async () => {
    DB.bookings.push({
      id: 'bk-race', tenant_id: TENANT_A, schedule_id: 'sch-1',
      status: 'scheduled', start_time: '2026-08-01T09:00:00', team_member_id: 'tm-original',
    })

    const res = await POST(
      req({ occurrence_date: '2026-08-01', type: 'reassign', new_team_member_id: 'tm-new' }),
      params('sch-1'),
    )
    const json = await res.json()

    expect(json.bookings_updated).toBe(1)
    expect(DB.bookings.find((r) => r.id === 'bk-race')?.team_member_id).toBe('tm-new')
  })

  it('move: leaves an in-progress booking\'s time alone when checkin lands between the read and the update', async () => {
    DB.bookings.push({
      id: 'bk-race', tenant_id: TENANT_A, schedule_id: 'sch-1',
      status: 'scheduled', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T12:00:00',
    })
    raceFlip.mutate = (row) => { row.status = 'in_progress' }

    const res = await POST(
      req({ occurrence_date: '2026-08-01', type: 'move', new_start_time: '14:00' }),
      params('sch-1'),
    )
    const json = await res.json()

    expect(json.bookings_updated).toBe(0)
    expect(DB.bookings.find((r) => r.id === 'bk-race')?.start_time).toBe('2026-08-01T09:00:00')
  })
})
