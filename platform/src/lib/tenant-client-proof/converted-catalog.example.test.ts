import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the catalog conversion: the read (single-table scoped list on
 * service_types) flows through one tenantClient(tenantId), stays tenant-scoped, orders
 * by sort_order, surfaces DB errors, AND — the new bit this proof pins — leaves the
 * post-fetch legacy-price transform intact after the client swap. No cross-table dep.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listCatalogConverted } from './converted-catalog.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

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
      builder.select = (cols: string) => {
        rec.selects.push(cols)
        return builder
      }
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

describe('listCatalogConverted', () => {
  it('routes through one tenantClient(tenantId); tenant-scoped; orders by sort_order asc', async () => {
    const rows = [{ id: 's1', name: 'Deep Clean', price_cents: 12000, per_unit: 'job', default_hourly_rate: null }]
    const { db, calls } = makeRecordingDb({ service_types: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listCatalogConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'service_types')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.selects[0]).toContain('sort_order')
    expect(c.orders).toContainEqual(['sort_order', { ascending: true }])
    // Priced row passes through untouched.
    expect(res[0]).toMatchObject({ id: 's1', price_cents: 12000, per_unit: 'job' })
  })

  it('applies the legacy-price fallback (price_cents from default_hourly_rate; per_unit -> hour)', async () => {
    const rows = [
      // Legacy row: no SKU price, hourly rate set -> fallback to 45*100 and per_unit 'hour'
      { id: 's2', name: 'Hourly', price_cents: null, per_unit: null, default_hourly_rate: 45 },
      // Modern row: price set -> untouched, and default_hourly_rate stripped from output
      { id: 's3', name: 'Flat', price_cents: 9900, per_unit: 'job', default_hourly_rate: 30 },
    ]
    const { db } = makeRecordingDb({ service_types: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listCatalogConverted(TENANT)

    expect(res[0]).toMatchObject({ id: 's2', price_cents: 4500, per_unit: 'hour' })
    expect(res[1]).toMatchObject({ id: 's3', price_cents: 9900, per_unit: 'job' })
    // default_hourly_rate is destructured out of the response shape.
    expect('default_hourly_rate' in res[1]).toBe(false)
  })

  it('propagates a DB error (RLS default-deny surfaces, is not swallowed)', async () => {
    const { db } = makeRecordingDb({
      service_types: new Error('permission denied for table service_types'),
    })
    tenantClientMock.mockReturnValue(db)

    await expect(listCatalogConverted(TENANT)).rejects.toThrow(/permission denied/)
  })
})
