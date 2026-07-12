import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for GET /api/schedules/[id]: the by-id detail read flows through ONE reused
 * tenantClient(tenantId) and fires two PARALLEL reads — the parent `recurring_schedules`
 * (.eq('id').single()) and its children `bookings` (.eq('schedule_id').order('start_time')).
 *
 * IDOR LENS (the point of this proof): BOTH reads pair the id filter with .eq('tenant_id', …),
 * so a caller cannot cross tenants by guessing an id. The tests PIN that both filters survive
 * the swap — the correct-pattern counter-example to the W4 selena by-id-without-scope flag.
 *
 * Also pins: the SAFE clients embed + the untiered team_members embed (HOLD), and the live
 * route's faithful SWALLOW (ignores both reads' errors → schedule null → the route's 404).
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { getScheduleDetailConverted } from './converted-schedule-detail.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const OTHER = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
const SCHED_ID = 'sched-123'

type QueryRecord = {
  table: string
  selects: string[]
  eqs: Array<[string, unknown]>
  orders: Array<[string, unknown]>
  singled: boolean
}

/** Result may be an Error (rejection) or a { data, error } envelope (Supabase resolves). */
function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, selects: [], eqs: [], orders: [], singled: false }
      calls.push(rec)
      const result = resultsByTable[table] ?? { data: null, error: null }
      const builder: Record<string, unknown> = {}
      builder.select = (cols: string) => { rec.selects.push(cols); return builder }
      builder.eq = (col: string, val: unknown) => { rec.eqs.push([col, val]); return builder }
      builder.order = (col: string, opts?: unknown) => { rec.orders.push([col, opts]); return builder }
      builder.single = () => { rec.singled = true; return builder }
      builder.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
        if (result instanceof Error) return reject(result)
        return resolve(result)
      }
      return builder
    },
  }
  return { db, calls }
}

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('getScheduleDetailConverted (GET /api/schedules/[id])', () => {
  it('routes both parallel reads through one tenantClient(tenantId) and stitches the pair', async () => {
    const schedule = { id: SCHED_ID, tenant_id: TENANT, clients: { name: 'Acme' } }
    const bookings = [{ id: 'b1', schedule_id: SCHED_ID }]
    const { db, calls } = makeRecordingDb({
      recurring_schedules: { data: schedule, error: null },
      bookings: { data: bookings, error: null },
    })
    tenantClientMock.mockReturnValue(db)

    const res = await getScheduleDetailConverted(TENANT, SCHED_ID)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    // Two parallel reads issued: parent + children.
    expect(calls.map((c) => c.table).sort()).toEqual(['bookings', 'recurring_schedules'])
    const parent = calls.find((c) => c.table === 'recurring_schedules')!
    const children = calls.find((c) => c.table === 'bookings')!
    expect(parent.singled).toBe(true)
    expect(children.orders).toEqual([['start_time', undefined]])
    expect(res).toEqual({ schedule, bookings })
  })

  it('IDOR-clean: BOTH reads pair the id filter with the tenant scope', async () => {
    const { db, calls } = makeRecordingDb({
      recurring_schedules: { data: { id: SCHED_ID }, error: null },
      bookings: { data: [], error: null },
    })
    tenantClientMock.mockReturnValue(db)

    await getScheduleDetailConverted(TENANT, SCHED_ID)

    const parent = calls.find((c) => c.table === 'recurring_schedules')!
    const children = calls.find((c) => c.table === 'bookings')!
    // Parent: id + tenant scope both present.
    expect(parent.eqs).toContainEqual(['id', SCHED_ID])
    expect(parent.eqs).toContainEqual(['tenant_id', TENANT])
    // Children: schedule_id + tenant scope both present.
    expect(children.eqs).toContainEqual(['schedule_id', SCHED_ID])
    expect(children.eqs).toContainEqual(['tenant_id', TENANT])
  })

  it('keeps the SAFE clients embed and the untiered team_members embed (HOLD) on the parent', async () => {
    const { db, calls } = makeRecordingDb({
      recurring_schedules: { data: { id: SCHED_ID }, error: null },
      bookings: { data: [], error: null },
    })
    tenantClientMock.mockReturnValue(db)

    await getScheduleDetailConverted(TENANT, SCHED_ID)

    const select = calls.find((c) => c.table === 'recurring_schedules')!.selects[0]
    expect(select).toContain('clients(name, phone, address)')    // tier #1, SAFE
    expect(select).toContain('team_members(name, phone)')        // untiered, HOLD
  })

  it('scopes to the caller tenant, never a second tenant', async () => {
    const { db, calls } = makeRecordingDb({
      recurring_schedules: { data: null, error: null },
      bookings: { data: [], error: null },
    })
    tenantClientMock.mockReturnValue(db)

    await getScheduleDetailConverted(OTHER, SCHED_ID)

    expect(tenantClientMock).toHaveBeenCalledWith(OTHER)
    for (const c of calls) {
      expect(c.eqs).toContainEqual(['tenant_id', OTHER])
      expect(c.eqs).not.toContainEqual(['tenant_id', TENANT])
    }
  })

  it('faithfully SWALLOWS a read error to null (schedule null → route 404), not a throw', async () => {
    // Supabase resolves { data: null, error } on an RLS default-deny; the live route ignores
    // `error` and destructures only `data`. So schedule → null (the route maps that to 404).
    const { db } = makeRecordingDb({
      recurring_schedules: { data: null, error: { message: 'permission denied for table recurring_schedules' } },
      bookings: { data: null, error: { message: 'permission denied for table bookings' } },
    })
    tenantClientMock.mockReturnValue(db)

    const res = await getScheduleDetailConverted(TENANT, SCHED_ID)
    expect(res).toEqual({ schedule: null, bookings: null })
  })
})
