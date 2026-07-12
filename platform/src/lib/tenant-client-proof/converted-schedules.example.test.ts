import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for GET /api/schedules: the read flows through one tenantClient(tenantId),
 * keeps the `.eq('tenant_id', …)` scope, keeps BOTH embeds and the created-at-desc order, and
 * returns `{ schedules }` verbatim. The test PINS the inversion hazard: the select carries a
 * `team_members(name)` embed and team_members has no tier slot → HOLD (do not wire) until it
 * does. clients(name) is the SAFE (tier #1) embed on the same select.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listSchedulesConverted } from './converted-schedules.example'

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

describe('listSchedulesConverted (GET /api/schedules)', () => {
  it('routes through one tenantClient(tenantId); keeps tenant scope + created_at desc order', async () => {
    const rows = [{ id: 's1', tenant_id: TENANT, clients: { name: 'Acme' }, team_members: { name: 'Rae' } }]
    const { db, calls } = makeRecordingDb({ recurring_schedules: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listSchedulesConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'recurring_schedules')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.orders).toEqual([['created_at', { ascending: false }]])
    expect(res).toEqual({ schedules: rows })
  })

  it('carries BOTH the SAFE clients(name) embed and the HAZARD team_members(name) embed', async () => {
    const { db, calls } = makeRecordingDb({ recurring_schedules: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listSchedulesConverted(TENANT)

    const select = calls.find((x) => x.table === 'recurring_schedules')!.selects[0]
    expect(select).toContain('clients(name)')      // tier #1 → safe
    expect(select).toContain('team_members(name)') // untiered → inversion hazard, HOLD
  })

  it('returns { schedules: data } verbatim (no ?? [] coalesce — faithful to live)', async () => {
    const { db } = makeRecordingDb({ recurring_schedules: { data: null, error: null } })
    tenantClientMock.mockReturnValue(db)

    // Live route returns raw data; the proof must NOT silently upgrade null → [].
    expect(await listSchedulesConverted(TENANT)).toEqual({ schedules: null })
  })

  it('scopes to the caller tenant, never a second tenant', async () => {
    const { db, calls } = makeRecordingDb({ recurring_schedules: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listSchedulesConverted(OTHER)

    expect(tenantClientMock).toHaveBeenCalledWith(OTHER)
    const c = calls.find((x) => x.table === 'recurring_schedules')!
    expect(c.eqs).toContainEqual(['tenant_id', OTHER])
    expect(c.eqs).not.toContainEqual(['tenant_id', TENANT])
  })

  it('surfaces a read error (throws), not swallowed', async () => {
    const { db } = makeRecordingDb({ recurring_schedules: new Error('permission denied for table recurring_schedules') })
    tenantClientMock.mockReturnValue(db)

    await expect(listSchedulesConverted(TENANT)).rejects.toThrow(/permission denied/)
  })
})
