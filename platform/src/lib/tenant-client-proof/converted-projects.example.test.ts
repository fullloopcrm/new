import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for GET /api/projects: the read flows through one tenantClient(tenantId),
 * keeps the `.eq('tenant_id', …)` scope, keeps the sole SAFE `clients(name)` embed (child
 * tier #1, before parent `projects` #29), keeps the start-date-asc order, and returns the
 * `{ projects }` shape. Uniformly-safe embed → clean SAFE cutover (contrast jobs' split embed).
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listProjectsConverted } from './converted-projects.example'

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

describe('listProjectsConverted (GET /api/projects)', () => {
  it('routes through one tenantClient(tenantId); keeps tenant scope + start_date asc order', async () => {
    const rows = [{ id: 'p1', tenant_id: TENANT, title: 'Reno', start_date: '2026-01-01', clients: { name: 'Acme' } }]
    const { db, calls } = makeRecordingDb({ projects: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listProjectsConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'projects')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.orders).toEqual([['start_date', { ascending: true }]])
    expect(res).toEqual({ projects: rows })
  })

  it('keeps the SAFE clients(name) embed as the ONLY embed (uniformly-safe cutover)', async () => {
    const { db, calls } = makeRecordingDb({ projects: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listProjectsConverted(TENANT)

    const select = calls.find((x) => x.table === 'projects')!.selects[0]
    // clients is tier #1 (before projects #29) → embed is load-bearing at cutover.
    expect(select).toContain('clients(name)')
    // No other embed rides this read (no job_payments / team_members-style late/untiered child).
    expect(select).not.toContain('team_members')
    expect(select).not.toContain('job_payments')
  })

  it('returns { projects: [] } when the read yields no rows', async () => {
    const { db } = makeRecordingDb({ projects: { data: null, error: null } })
    tenantClientMock.mockReturnValue(db)

    expect(await listProjectsConverted(TENANT)).toEqual({ projects: [] })
  })

  it('scopes to the caller tenant, never a second tenant', async () => {
    const { db, calls } = makeRecordingDb({ projects: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listProjectsConverted(OTHER)

    expect(tenantClientMock).toHaveBeenCalledWith(OTHER)
    const c = calls.find((x) => x.table === 'projects')!
    expect(c.eqs).toContainEqual(['tenant_id', OTHER])
    expect(c.eqs).not.toContainEqual(['tenant_id', TENANT])
  })

  it('surfaces a read error (throws), not swallowed to []', async () => {
    const { db } = makeRecordingDb({ projects: new Error('permission denied for table projects') })
    tenantClientMock.mockReturnValue(db)

    await expect(listProjectsConverted(TENANT)).rejects.toThrow(/permission denied/)
  })
})
