import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the entities SHARED-LIB-HELPER conversion: `listEntities(tenantId)` —
 * called by multiple finance routes — flows through one tenantClient(tenantId) and keeps the
 * tenant scope, the `active = true` filter and the dual order (is_default desc, name asc).
 * The point of this proof: converting ONE helper scopes every caller, with no signature
 * change. Single table `entities` (tier #17), floor RLS case, safe cutover, no cross-table dep.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listEntitiesConverted } from './converted-entities-lib.example'

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
      builder.select = (cols: string) => { rec.selects.push(cols); return builder }
      builder.eq = (col: string, val: unknown) => { rec.eqs.push([col, val]); return builder }
      builder.order = (col: string, opts?: unknown) => { rec.orders.push([col, opts]); return builder }
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

describe('listEntitiesConverted (shared lib helper)', () => {
  it('routes through one tenantClient(tenantId); keeps tenant scope + active filter', async () => {
    const rows = [{ id: 'e1', tenant_id: TENANT, name: 'HoldCo', is_default: true, active: true }]
    const { db, calls } = makeRecordingDb({ entities: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listEntitiesConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'entities')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.eqs).toContainEqual(['active', true])
    expect(res).toEqual(rows)
  })

  it('keeps the dual order: is_default desc, then name asc', async () => {
    const { db, calls } = makeRecordingDb({ entities: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listEntitiesConverted(TENANT)

    const c = calls.find((x) => x.table === 'entities')!
    expect(c.orders).toEqual([
      ['is_default', { ascending: false }],
      ['name', { ascending: true }],
    ])
  })

  it('returns [] when the helper reads no rows', async () => {
    const { db } = makeRecordingDb({ entities: { data: null, error: null } })
    tenantClientMock.mockReturnValue(db)

    expect(await listEntitiesConverted(TENANT)).toEqual([])
  })

  it('scopes to the caller tenant, never a second tenant', async () => {
    const { db, calls } = makeRecordingDb({ entities: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listEntitiesConverted(OTHER)

    expect(tenantClientMock).toHaveBeenCalledWith(OTHER)
    const c = calls.find((x) => x.table === 'entities')!
    expect(c.eqs).toContainEqual(['tenant_id', OTHER])
    expect(c.eqs).not.toContainEqual(['tenant_id', TENANT])
  })

  it('surfaces a read error (throws), not swallowed to []', async () => {
    const { db } = makeRecordingDb({ entities: new Error('permission denied for table entities') })
    tenantClientMock.mockReturnValue(db)

    await expect(listEntitiesConverted(TENANT)).rejects.toThrow(/permission denied/)
  })
})
