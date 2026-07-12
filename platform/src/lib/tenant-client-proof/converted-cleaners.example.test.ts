import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the cleaners conversion: the read (single-table scoped list on
 * team_members) flows through one tenantClient(tenantId), stays tenant-scoped, and keeps
 * the two-level ordering. The distinctive assertion here is that the recorded table is
 * `team_members` (NOT the route name `cleaners`) — the alias is driven by `.from(...)`.
 * No cross-table dep.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listCleanersConverted } from './converted-cleaners.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const OTHER = 'ffffffff-ffff-4fff-8fff-ffffffffffff'

type QueryRecord = {
  table: string
  selects: string[]
  eqs: Array<[string, unknown]>
  orders: Array<[string, unknown]>
}

function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, selects: [], eqs: [], orders: [] }
      calls.push(rec)
      const result = resultsByTable[table] ?? { data: [], error: null }
      const builder: Record<string, unknown> = {}
      builder.select = (cols: string) => {
        rec.selects.push(cols)
        return builder
      }
      builder.eq = (col: string, val: unknown) => {
        rec.eqs.push([col, val])
        return builder
      }
      builder.order = (col: string, opts?: unknown) => {
        rec.orders.push([col, opts])
        return builder
      }
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

describe('listCleanersConverted', () => {
  it('routes through one tenantClient(tenantId); reads team_members (NOT the route name); tenant-scoped', async () => {
    const rows = [{ id: 'w1', name: 'Ana', priority: 1 }]
    const { db, calls } = makeRecordingDb({ team_members: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listCleanersConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    // The alias route name is `cleaners` but the table is `team_members`.
    expect(calls.map((c) => c.table)).toEqual(['team_members'])
    const c = calls[0]
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(res).toEqual(rows)
  })

  it('keeps the two-level order: priority asc nullsFirst:false, then name (bare)', async () => {
    const { db, calls } = makeRecordingDb({ team_members: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listCleanersConverted(TENANT)

    const c = calls.find((x) => x.table === 'team_members')!
    expect(c.orders).toEqual([
      ['priority', { ascending: true, nullsFirst: false }],
      ['name', undefined],
    ])
  })

  it('scopes to the caller tenant, never a second tenant', async () => {
    const { db, calls } = makeRecordingDb({ team_members: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listCleanersConverted(OTHER)

    expect(tenantClientMock).toHaveBeenCalledWith(OTHER)
    const c = calls[0]
    expect(c.eqs).toContainEqual(['tenant_id', OTHER])
    expect(c.eqs).not.toContainEqual(['tenant_id', TENANT])
  })

  it('propagates a DB error (RLS default-deny surfaces, is not swallowed to [])', async () => {
    const { db } = makeRecordingDb({
      team_members: new Error('permission denied for table team_members'),
    })
    tenantClientMock.mockReturnValue(db)

    await expect(listCleanersConverted(TENANT)).rejects.toThrow(/permission denied/)
  })
})
