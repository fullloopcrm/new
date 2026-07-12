import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the campaigns conversion: the list flows through one
 * tenantClient(tenantId), stays tenant-scoped, and surfaces DB errors instead of collapsing
 * them to an empty list. Single-table floor case — no joins, no child reads, no cross-table
 * dependency to pin.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listCampaignsConverted } from './converted-campaigns.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

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

describe('listCampaignsConverted', () => {
  it('routes through one tenantClient(tenantId); tenant-scoped single-table read', async () => {
    const rows = [{ id: 'c1', name: 'Spring Promo', tenant_id: TENANT }]
    const { db, calls } = makeRecordingDb({ campaigns: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listCampaignsConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'campaigns')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    // Floor case: exactly one table touched, no embedded child resource in the select.
    expect(calls).toHaveLength(1)
    expect(c.selects[0]).toBe('*')
    expect(res).toEqual(rows)
  })

  it('propagates a DB error (RLS default-deny surfaces, is not swallowed to [])', async () => {
    const { db } = makeRecordingDb({
      campaigns: new Error('permission denied for table campaigns'),
    })
    tenantClientMock.mockReturnValue(db)

    await expect(listCampaignsConverted(TENANT)).rejects.toThrow(/permission denied/)
  })
})
