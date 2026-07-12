import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the team roster conversion: the read (single-table scoped list on
 * team_members, a SEPARATE call site from /api/cleaners) flows through one
 * tenantClient(tenantId), stays tenant-scoped, orders by created_at desc (bare, no options
 * object), returns the `{ team }` envelope verbatim, and surfaces a DB error via throw
 * (not swallowed to []).
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listTeamConverted } from './converted-team.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

type QueryRecord = { table: string; eqs: Array<[string, unknown]>; orders: Array<[string, unknown]> }

function makeRecordingDb(result: unknown) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, eqs: [], orders: [] }
      calls.push(rec)
      const builder: Record<string, unknown> = {}
      builder.select = () => builder
      builder.eq = (col: string, val: unknown) => {
        rec.eqs.push([col, val])
        return builder
      }
      builder.order = (col: string, opts: unknown) => {
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

describe('listTeamConverted', () => {
  it('routes through tenantClient(tenantId); reads team_members; tenant-scoped; orders created_at desc; wraps as { team }', async () => {
    const rows = [{ id: 'tm1', name: 'Jane Cleaner' }]
    const { db, calls } = makeRecordingDb({ data: rows, error: null })
    tenantClientMock.mockReturnValue(db)

    const res = await listTeamConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'team_members')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.orders).toContainEqual(['created_at', { ascending: false }])
    expect(res).toEqual({ team: rows })
  })

  it('propagates a DB error (RLS default-deny surfaces, is not swallowed to [])', async () => {
    const { db } = makeRecordingDb({
      data: null,
      error: { message: 'permission denied for table team_members' },
    })
    tenantClientMock.mockReturnValue(db)

    await expect(listTeamConverted(TENANT)).rejects.toMatchObject({
      message: 'permission denied for table team_members',
    })
  })
})
