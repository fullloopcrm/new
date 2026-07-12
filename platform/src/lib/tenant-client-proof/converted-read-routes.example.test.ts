import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Proves the conversion did the one thing that matters: the read now flows through
 * tenantClient(tenantId) (RLS-enforced), NOT supabaseAdmin (RLS bypass), while the
 * table and the explicit tenant_id scope are preserved. We mock tenantClient with a
 * recording query builder and assert the routing + scope, not the DB itself.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import {
  listQuoteTemplatesConverted,
  listCrewsConverted,
  clientStatsConverted,
} from './converted-read-routes.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

type QueryRecord = { table: string; eqs: Array<[string, unknown]> }

/** A chainable, awaitable fake Supabase client that records table + .eq() calls. */
function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, eqs: [] }
      calls.push(rec)
      const result = resultsByTable[table] ?? { data: [], error: null, count: 0 }
      // Every chain method returns the same builder; `then` makes it awaitable
      // at any point in the chain (count queries await without a terminal .order).
      const builder: Record<string, unknown> = {}
      const passthrough = () => builder
      builder.select = passthrough
      builder.gte = passthrough
      builder.order = passthrough
      builder.eq = (col: string, val: unknown) => {
        rec.eqs.push([col, val])
        return builder
      }
      builder.then = (resolve: (v: unknown) => void) => resolve(result)
      return builder
    },
  }
  return { db, calls }
}

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('listQuoteTemplatesConverted', () => {
  it('routes through tenantClient(tenantId) and scopes quote_templates by tenant', async () => {
    const { db, calls } = makeRecordingDb({
      quote_templates: { data: [{ id: 'qt1' }], error: null },
    })
    tenantClientMock.mockReturnValue(db)

    const res = await listQuoteTemplatesConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    expect(calls[0].table).toBe('quote_templates')
    expect(calls[0].eqs).toContainEqual(['tenant_id', TENANT])
    expect(res.templates).toEqual([{ id: 'qt1' }])
  })
})

describe('listCrewsConverted', () => {
  it('routes through tenantClient(tenantId) and scopes crews by tenant', async () => {
    const { db, calls } = makeRecordingDb({
      crews: {
        data: [
          {
            id: 'c1',
            name: 'A',
            color: null,
            active: true,
            crew_members: [{ team_member_id: 'tm1', team_members: { name: 'Pat' } }],
          },
        ],
        error: null,
      },
    })
    tenantClientMock.mockReturnValue(db)

    const res = await listCrewsConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    expect(calls[0].table).toBe('crews')
    expect(calls[0].eqs).toContainEqual(['tenant_id', TENANT])
    expect(res.crews[0].members[0]).toEqual({ id: 'tm1', name: 'Pat' })
  })
})

describe('clientStatsConverted', () => {
  it('routes every count query through tenantClient(tenantId), all scoped to clients+tenant', async () => {
    const { db, calls } = makeRecordingDb({
      clients: { count: 5, error: null },
    })
    tenantClientMock.mockReturnValue(db)

    const res = await clientStatsConverted(TENANT)

    // tenantClient is called once; the single scoped client fans out to 3 queries.
    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    expect(calls).toHaveLength(3)
    for (const c of calls) {
      expect(c.table).toBe('clients')
      expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    }
    expect(res).toEqual({ total: 5, active: 5, newThisMonth: 5, inactive: 0 })
  })
})
