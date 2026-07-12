import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the recurring-expenses conversion: the list flows through one
 * tenantClient(tenantId), stays tenant-scoped, filters to active rows, and surfaces DB errors
 * instead of swallowing them. Single-table floor case on the getTenantForRequest() auth path —
 * no joins, no child reads, no cross-table dependency to pin.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listRecurringExpensesConverted } from './converted-recurring-expenses.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

type QueryRecord = { table: string; eqs: Array<[string, unknown]> }

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

describe('listRecurringExpensesConverted', () => {
  it('routes through one tenantClient(tenantId); tenant+active scoped', async () => {
    const rows = [{ id: 're1', label: 'Rent', active: true }]
    const { db, calls } = makeRecordingDb({ recurring_expenses: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listRecurringExpensesConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'recurring_expenses')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.eqs).toContainEqual(['active', true])
    expect(res).toEqual(rows)
  })

  it('propagates a DB error (RLS default-deny surfaces, is not swallowed)', async () => {
    const { db } = makeRecordingDb({
      recurring_expenses: new Error('permission denied for table recurring_expenses'),
    })
    tenantClientMock.mockReturnValue(db)

    await expect(listRecurringExpensesConverted(TENANT)).rejects.toThrow(/permission denied/)
  })
})
