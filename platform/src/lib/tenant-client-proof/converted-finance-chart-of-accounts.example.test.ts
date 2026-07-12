import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the chart-of-accounts conversion: the list flows through one
 * tenantClient(tenantId) (RLS-enforced), NOT supabaseAdmin (RLS bypass), stays tenant-scoped,
 * and surfaces a DB error instead of swallowing it. This is the floor case — no joins, no
 * child reads — so there is nothing to mask and no cross-table dependency to pin.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listChartOfAccountsConverted } from './converted-finance-chart-of-accounts.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

type QueryRecord = { table: string; eqs: Array<[string, unknown]> }

/** result may be a fixed value or an Error (the awaited query then REJECTS — an RLS deny). */
function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, eqs: [] }
      calls.push(rec)
      const result = resultsByTable[table] ?? { data: [], error: null }
      const builder: Record<string, unknown> = {}
      const passthrough = () => builder
      builder.select = passthrough
      builder.order = passthrough
      builder.eq = (col: string, val: unknown) => {
        rec.eqs.push([col, val])
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

describe('listChartOfAccountsConverted', () => {
  it('routes through one tenantClient(tenantId) and tenant-scopes the chart_of_accounts read', async () => {
    const rows = [{ id: 'a1', code: '1000', name: 'Cash' }]
    const { db, calls } = makeRecordingDb({ chart_of_accounts: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listChartOfAccountsConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'chart_of_accounts')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(res).toEqual(rows)
  })

  it('propagates a DB error (RLS default-deny surfaces, is not swallowed)', async () => {
    const { db } = makeRecordingDb({
      chart_of_accounts: new Error('permission denied for table chart_of_accounts'),
    })
    tenantClientMock.mockReturnValue(db)

    await expect(listChartOfAccountsConverted(TENANT)).rejects.toThrow(/permission denied/)
  })
})
