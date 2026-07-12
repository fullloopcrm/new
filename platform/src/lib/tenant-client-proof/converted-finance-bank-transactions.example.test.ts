import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the finance/bank-transactions conversion: the read flows through
 * tenantClient(tenantId) (RLS-enforced), NOT supabaseAdmin (RLS bypass), stays scoped to
 * bank_transactions + tenant_id, carries the embedded-join select verbatim, and applies
 * optional filters only when present. We also assert the join select string is preserved,
 * because the cross-table RLS dependency (bank_accounts, chart_of_accounts) rides on it.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import {
  bankTransactionsConverted,
  type BankTxnFilters,
} from './converted-finance-bank-transactions.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

type QueryRecord = {
  table: string
  selects: string[]
  eqs: Array<[string, unknown]>
  ranges: Array<[string, string, unknown]>
}

function makeRecordingDb(result: unknown) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, selects: [], eqs: [], ranges: [] }
      calls.push(rec)
      const builder: Record<string, unknown> = {}
      const passthrough = () => builder
      builder.order = passthrough
      builder.limit = passthrough
      builder.select = (cols: string) => {
        rec.selects.push(cols)
        return builder
      }
      builder.eq = (col: string, val: unknown) => {
        rec.eqs.push([col, val])
        return builder
      }
      builder.gte = (col: string, val: unknown) => {
        rec.ranges.push(['gte', col, val])
        return builder
      }
      builder.lte = (col: string, val: unknown) => {
        rec.ranges.push(['lte', col, val])
        return builder
      }
      builder.then = (resolve: (v: unknown) => void) => resolve(result)
      return builder
    },
  }
  return { db, calls }
}

const NO_FILTERS: BankTxnFilters = {
  status: null,
  bankAccountId: null,
  entityId: null,
  from: null,
  to: null,
  limit: 200,
}

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('bankTransactionsConverted', () => {
  it('routes through tenantClient(tenantId), scopes bank_transactions by tenant, keeps the join select', async () => {
    const { db, calls } = makeRecordingDb({ data: [{ id: 't1' }], error: null })
    tenantClientMock.mockReturnValue(db)

    const res = await bankTransactionsConverted(TENANT, NO_FILTERS)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('bank_transactions')
    expect(calls[0].eqs).toEqual([['tenant_id', TENANT]])
    // The embedded join must survive the conversion (cross-table RLS dependency rides on it).
    expect(calls[0].selects[0]).toContain('bank_accounts(id, name, mask, entity_id)')
    expect(calls[0].selects[0]).toContain('chart_of_accounts!bank_transactions_coa_id_fkey(id, code, name)')
    expect(res).toEqual({ transactions: [{ id: 't1' }] })
  })

  it('applies each optional filter exactly when present, keeping the tenant scope', async () => {
    const { db, calls } = makeRecordingDb({ data: [], error: null })
    tenantClientMock.mockReturnValue(db)

    await bankTransactionsConverted(TENANT, {
      status: 'unreviewed',
      bankAccountId: 'ba1',
      entityId: 'e1',
      from: '2026-01-01',
      to: '2026-02-01',
      limit: 300,
    })

    const c = calls[0]
    expect(c.eqs).toEqual([
      ['tenant_id', TENANT],
      ['status', 'unreviewed'],
      ['bank_account_id', 'ba1'],
      ['entity_id', 'e1'],
    ])
    expect(c.ranges).toEqual([
      ['gte', 'txn_date', '2026-01-01'],
      ['lte', 'txn_date', '2026-02-01'],
    ])
  })

  it('propagates a query error (fail-closed, no silent empty result)', async () => {
    const { db } = makeRecordingDb({ data: null, error: new Error('rls denied') })
    tenantClientMock.mockReturnValue(db)

    await expect(bankTransactionsConverted(TENANT, NO_FILTERS)).rejects.toThrow('rls denied')
  })
})
