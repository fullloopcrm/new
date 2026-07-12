import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the quotes conversion: the read (embedded clients join + dynamic
 * optional-filter chain + limit) flows through one tenantClient(tenantId), stays
 * tenant-scoped, chains each optional filter ONLY when supplied, clamps limit to 500, and
 * surfaces DB errors. Pins the embed shape the cross-table dependency cares about (clients #1
 * before parent quotes #10).
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listQuotesConverted } from './converted-quotes.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

type QueryRecord = {
  table: string
  selects: string[]
  eqs: Array<[string, unknown]>
  limits: number[]
}

function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, selects: [], eqs: [], limits: [] }
      calls.push(rec)
      const result = resultsByTable[table] ?? { data: [], error: null }
      const builder: Record<string, unknown> = {}
      const passthrough = () => builder
      builder.order = passthrough
      builder.select = (cols: string) => {
        rec.selects.push(cols)
        return builder
      }
      builder.limit = (n: number) => {
        rec.limits.push(n)
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

describe('listQuotesConverted', () => {
  it('routes through one tenantClient(tenantId); tenant-scoped; embeds clients; no optional filters when absent; default limit 100', async () => {
    const rows = [{ id: 'q1', number: 'Q-1', clients: { id: 'cl1', name: 'Acme' } }]
    const { db, calls } = makeRecordingDb({ quotes: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listQuotesConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'quotes')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.selects[0]).toContain('clients(')
    expect(c.limits).toEqual([100])
    // No optional filters chained when none supplied:
    expect(c.eqs.find(([col]) => col === 'status')).toBeUndefined()
    expect(c.eqs.find(([col]) => col === 'client_id')).toBeUndefined()
    expect(c.eqs.find(([col]) => col === 'deal_id')).toBeUndefined()
    expect(res).toEqual(rows)
  })

  it('chains status, client_id, and deal_id only when supplied; clamps limit to 500', async () => {
    const { db, calls } = makeRecordingDb({ quotes: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listQuotesConverted(TENANT, {
      status: 'sent',
      clientId: 'cl9',
      dealId: 'd7',
      limit: 9000,
    })

    const c = calls.find((x) => x.table === 'quotes')!
    expect(c.eqs).toContainEqual(['status', 'sent'])
    expect(c.eqs).toContainEqual(['client_id', 'cl9'])
    expect(c.eqs).toContainEqual(['deal_id', 'd7'])
    expect(c.limits).toEqual([500])
  })

  it('propagates a DB error (RLS default-deny surfaces, is not swallowed)', async () => {
    const { db } = makeRecordingDb({
      quotes: new Error('permission denied for table quotes'),
    })
    tenantClientMock.mockReturnValue(db)

    await expect(listQuotesConverted(TENANT)).rejects.toThrow(/permission denied/)
  })
})
