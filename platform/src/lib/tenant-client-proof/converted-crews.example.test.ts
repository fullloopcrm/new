import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for GET /api/crews: the read flows through one tenantClient(tenantId),
 * keeps the `.eq('tenant_id', …)` scope, keeps the TWO-LEVEL nested embed
 * `crew_members(team_member_id, team_members(id, name))` (both levels UNTIERED → double
 * inversion hazard), keeps the name-asc order, applies the SAME post-fetch flatten/`'—'`
 * shaping, and returns the `{ crews }` shape. First nested-embed case in the proof set.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listCrewsConverted } from './converted-crews.example'

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

describe('listCrewsConverted (GET /api/crews)', () => {
  it('routes through one tenantClient(tenantId); keeps tenant scope + name-asc order', async () => {
    const rows = [{ id: 'c1', name: 'A-Team', color: '#f00', active: true, crew_members: [] }]
    const { db, calls } = makeRecordingDb({ crews: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listCrewsConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'crews')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.orders).toEqual([['name', { ascending: true }]])
    expect(res.crews).toEqual([{ id: 'c1', name: 'A-Team', color: '#f00', active: true, members: [] }])
  })

  it('keeps the TWO-LEVEL nested crew_members → team_members embed verbatim', async () => {
    const { db, calls } = makeRecordingDb({ crews: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listCrewsConverted(TENANT)

    const select = calls.find((x) => x.table === 'crews')!.selects[0]
    // Nested embed: parent `crews` embeds join `crew_members`, which embeds `team_members`.
    // Both are UNTIERED (grep of rls-tier-rollout-order.md = 0) → double inversion hazard.
    expect(select).toContain('crew_members(team_member_id, team_members(id, name))')
  })

  it('flattens the object-shaped inner embed and keeps the member id/name', async () => {
    const rows = [{
      id: 'c1', name: 'Crew', color: null, active: true,
      crew_members: [{ team_member_id: 'tm1', team_members: { name: 'Dana' } }],
    }]
    const { db } = makeRecordingDb({ crews: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listCrewsConverted(TENANT)
    expect(res.crews[0].members).toEqual([{ id: 'tm1', name: 'Dana' }])
  })

  it('flattens the ARRAY-shaped inner embed (PostgREST array variant) to its first row', async () => {
    const rows = [{
      id: 'c1', name: 'Crew', color: null, active: true,
      crew_members: [{ team_member_id: 'tm2', team_members: [{ name: 'Eli' }] }],
    }]
    const { db } = makeRecordingDb({ crews: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listCrewsConverted(TENANT)
    expect(res.crews[0].members).toEqual([{ id: 'tm2', name: 'Eli' }])
  })

  it("defaults a missing/denied member name to '—' (leaf embed default-deny surface)", async () => {
    // At cutover, an untiered team_members leaf default-denies → name is null → '—'.
    const rows = [{
      id: 'c1', name: 'Crew', color: null, active: true,
      crew_members: [
        { team_member_id: 'tm3', team_members: null },
        { team_member_id: 'tm4', team_members: { name: null } },
      ],
    }]
    const { db } = makeRecordingDb({ crews: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listCrewsConverted(TENANT)
    expect(res.crews[0].members).toEqual([{ id: 'tm3', name: '—' }, { id: 'tm4', name: '—' }])
  })

  it('returns { crews: [] } when the read yields no rows', async () => {
    const { db } = makeRecordingDb({ crews: { data: null, error: null } })
    tenantClientMock.mockReturnValue(db)

    expect(await listCrewsConverted(TENANT)).toEqual({ crews: [] })
  })

  it('scopes to the caller tenant, never a second tenant', async () => {
    const { db, calls } = makeRecordingDb({ crews: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listCrewsConverted(OTHER)

    expect(tenantClientMock).toHaveBeenCalledWith(OTHER)
    const c = calls.find((x) => x.table === 'crews')!
    expect(c.eqs).toContainEqual(['tenant_id', OTHER])
    expect(c.eqs).not.toContainEqual(['tenant_id', TENANT])
  })

  it('surfaces a read error (throws), not swallowed to []', async () => {
    const { db } = makeRecordingDb({ crews: new Error('permission denied for table crews') })
    tenantClientMock.mockReturnValue(db)

    await expect(listCrewsConverted(TENANT)).rejects.toThrow(/permission denied/)
  })
})
