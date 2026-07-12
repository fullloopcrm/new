import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for GET /api/routes: the read flows through one tenantClient(tenantId),
 * keeps the `.eq('tenant_id', …)` scope, keeps the untiered `team_members(...)` embed
 * (INVERSION HAZARD → HOLD), keeps the dual route_date-desc / created_at-desc order and the
 * 500-row limit, and appends the SAME optional filters — including the first `.gte`/`.lte`
 * bounded RANGE on `route_date` in the proof set. Base query is untouched by which filters run.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listRoutesConverted } from './converted-routes.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const OTHER = 'ffffffff-ffff-4fff-8fff-ffffffffffff'

type QueryRecord = {
  table: string
  selects: string[]
  eqs: Array<[string, unknown]>
  gtes: Array<[string, unknown]>
  ltes: Array<[string, unknown]>
  orders: Array<[string, unknown]>
  limits: number[]
}

function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, selects: [], eqs: [], gtes: [], ltes: [], orders: [], limits: [] }
      calls.push(rec)
      const result = resultsByTable[table] ?? { data: [], error: null }
      const builder: Record<string, unknown> = {}
      builder.select = (cols: string) => { rec.selects.push(cols); return builder }
      builder.eq = (col: string, val: unknown) => { rec.eqs.push([col, val]); return builder }
      builder.gte = (col: string, val: unknown) => { rec.gtes.push([col, val]); return builder }
      builder.lte = (col: string, val: unknown) => { rec.ltes.push([col, val]); return builder }
      builder.order = (col: string, opts?: unknown) => { rec.orders.push([col, opts]); return builder }
      builder.limit = (n: number) => { rec.limits.push(n); return builder }
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

describe('listRoutesConverted (GET /api/routes)', () => {
  it('routes through one tenantClient(tenantId); keeps scope, dual order, limit, embed', async () => {
    const rows = [{ id: 'r1', tenant_id: TENANT, route_date: '2026-02-01', team_members: null }]
    const { db, calls } = makeRecordingDb({ routes: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listRoutesConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'routes')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.orders).toEqual([['route_date', { ascending: false }], ['created_at', { ascending: false }]])
    expect(c.limits).toEqual([500])
    // Untiered team_members embed kept verbatim (HOLD until team_members tiered).
    expect(c.selects[0]).toContain('team_members(id, name, phone, home_latitude, home_longitude)')
    expect(res).toEqual({ routes: rows })
  })

  it('appends NO optional filters when none are supplied (only the tenant scope eq)', async () => {
    const { db, calls } = makeRecordingDb({ routes: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listRoutesConverted(TENANT)

    const c = calls.find((x) => x.table === 'routes')!
    expect(c.eqs).toEqual([['tenant_id', TENANT]]) // no date/team_member_id/status
    expect(c.gtes).toHaveLength(0)
    expect(c.ltes).toHaveLength(0)
  })

  it('applies the from/to bounded RANGE as .gte + .lte on route_date', async () => {
    const { db, calls } = makeRecordingDb({ routes: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listRoutesConverted(TENANT, { from: '2026-01-01', to: '2026-01-31' })

    const c = calls.find((x) => x.table === 'routes')!
    expect(c.gtes).toEqual([['route_date', '2026-01-01']])
    expect(c.ltes).toEqual([['route_date', '2026-01-31']])
  })

  it('applies all optional exact filters (date, team_member_id, status) alongside the scope', async () => {
    const { db, calls } = makeRecordingDb({ routes: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listRoutesConverted(TENANT, { date: '2026-03-03', teamMemberId: 'tm9', status: 'draft' })

    const c = calls.find((x) => x.table === 'routes')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.eqs).toContainEqual(['route_date', '2026-03-03'])
    expect(c.eqs).toContainEqual(['team_member_id', 'tm9'])
    expect(c.eqs).toContainEqual(['status', 'draft'])
  })

  it('returns { routes: [] } when the read yields no rows', async () => {
    const { db } = makeRecordingDb({ routes: { data: null, error: null } })
    tenantClientMock.mockReturnValue(db)

    expect(await listRoutesConverted(TENANT)).toEqual({ routes: [] })
  })

  it('scopes to the caller tenant, never a second tenant', async () => {
    const { db, calls } = makeRecordingDb({ routes: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listRoutesConverted(OTHER)

    expect(tenantClientMock).toHaveBeenCalledWith(OTHER)
    const c = calls.find((x) => x.table === 'routes')!
    expect(c.eqs).toContainEqual(['tenant_id', OTHER])
    expect(c.eqs).not.toContainEqual(['tenant_id', TENANT])
  })

  it('surfaces a read error (throws), not swallowed to []', async () => {
    const { db } = makeRecordingDb({ routes: new Error('permission denied for table routes') })
    tenantClientMock.mockReturnValue(db)

    await expect(listRoutesConverted(TENANT)).rejects.toThrow(/permission denied/)
  })
})
