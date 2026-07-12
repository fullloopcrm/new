import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the bank-accounts conversion: the read (including its two embedded
 * joins) flows through one tenantClient(tenantId), stays tenant-scoped, and the optional
 * entity_id filter is chained ONLY when provided. We also pin the embed shape the tier-order
 * hazard cares about: the select string names both child tables, so a reviewer can see exactly
 * which policies (chart_of_accounts #15, entities #17) must exist before this parent (#4)
 * converts.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listBankAccountsConverted } from './converted-finance-bank-accounts.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const ENTITY = 'entity-9'

type QueryRecord = { table: string; selects: string[]; eqs: Array<[string, unknown]> }

function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, selects: [], eqs: [] }
      calls.push(rec)
      const result = resultsByTable[table] ?? { data: [], error: null }
      const builder: Record<string, unknown> = {}
      const passthrough = () => builder
      builder.order = passthrough
      builder.select = (cols: string) => {
        rec.selects.push(cols)
        return builder
      }
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

describe('listBankAccountsConverted', () => {
  it('routes through one tenantClient(tenantId); tenant+active scoped; embeds both child tables; no entity filter when absent', async () => {
    const rows = [{ id: 'ba1', name: 'Ops Checking', chart_of_accounts: null, entities: null }]
    const { db, calls } = makeRecordingDb({ bank_accounts: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listBankAccountsConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'bank_accounts')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.eqs).toContainEqual(['active', true])
    // The embed shape the tier-order hazard depends on:
    expect(c.selects[0]).toContain('chart_of_accounts(')
    expect(c.selects[0]).toContain('entities(')
    // Optional filter absent → not chained:
    expect(c.eqs.find(([col]) => col === 'entity_id')).toBeUndefined()
    expect(res).toEqual(rows)
  })

  it('chains the entity_id filter only when an entityId is passed', async () => {
    const { db, calls } = makeRecordingDb({ bank_accounts: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listBankAccountsConverted(TENANT, ENTITY)

    const c = calls.find((x) => x.table === 'bank_accounts')!
    expect(c.eqs).toContainEqual(['entity_id', ENTITY])
  })

  it('propagates a DB error (RLS default-deny surfaces, is not swallowed)', async () => {
    const { db } = makeRecordingDb({
      bank_accounts: new Error('permission denied for table bank_accounts'),
    })
    tenantClientMock.mockReturnValue(db)

    await expect(listBankAccountsConverted(TENANT)).rejects.toThrow(/permission denied/)
  })
})
