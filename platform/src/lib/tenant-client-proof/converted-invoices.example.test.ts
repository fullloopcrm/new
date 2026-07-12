import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the invoices conversion: the read (with its embedded client join)
 * flows through one tenantClient(tenantId), stays tenant-scoped, each of the four optional
 * filters chains ONLY when its param is present, and the overdue flag adds its compound
 * lt+not-in clause as one atomic unit rather than as a lone .eq — the shape the tier-safe
 * embed and the widest-filter-surface findings depend on.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listInvoicesConverted } from './converted-invoices.example'

const TENANT = '9b7a5e2a-6b3a-4b1a-9c3a-2f6a1d8e4c10'
const TODAY = '2026-07-12'

type QueryRecord = {
  table: string
  selects: string[]
  eqs: Array<[string, unknown]>
  lts: Array<[string, unknown]>
  nots: Array<[string, string, unknown]>
  orders: Array<[string, unknown]>
  limits: number[]
}

function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, selects: [], eqs: [], lts: [], nots: [], orders: [], limits: [] }
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
      builder.lt = (col: string, val: unknown) => {
        rec.lts.push([col, val])
        return builder
      }
      builder.not = (col: string, op: string, val: unknown) => {
        rec.nots.push([col, op, val])
        return builder
      }
      builder.order = (col: string, opts: unknown) => {
        rec.orders.push([col, opts])
        return builder
      }
      builder.limit = (n: number) => {
        rec.limits.push(n)
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

describe('listInvoicesConverted', () => {
  it('routes through one tenantClient(tenantId); tenant-scoped; embeds clients; no optional filters when absent', async () => {
    const rows = [{ id: 'inv1', clients: null }]
    const { db, calls } = makeRecordingDb({ invoices: { data: rows, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listInvoicesConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'invoices')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.selects[0]).toContain('clients(')
    expect(c.orders).toContainEqual(['created_at', { ascending: false }])
    expect(c.limits).toEqual([100])
    // None of the four optional filters chained:
    expect(c.eqs.map(([col]) => col)).toEqual(['tenant_id'])
    expect(c.lts).toEqual([])
    expect(c.nots).toEqual([])
    expect(res).toEqual(rows)
  })

  it('chains each optional eq filter independently when its param is present', async () => {
    const { db, calls } = makeRecordingDb({ invoices: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listInvoicesConverted(TENANT, {
      status: 'sent',
      clientId: 'client-9',
      bookingId: 'booking-4',
      entityId: 'entity-2',
    })

    const c = calls.find((x) => x.table === 'invoices')!
    expect(c.eqs).toContainEqual(['status', 'sent'])
    expect(c.eqs).toContainEqual(['client_id', 'client-9'])
    expect(c.eqs).toContainEqual(['booking_id', 'booking-4'])
    expect(c.eqs).toContainEqual(['entity_id', 'entity-2'])
  })

  it('adds the overdue lt+not-in clause as one atomic unit only when overdueOnly is set', async () => {
    const { db, calls } = makeRecordingDb({ invoices: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listInvoicesConverted(TENANT, { overdueOnly: true, today: TODAY })

    const c = calls.find((x) => x.table === 'invoices')!
    expect(c.lts).toContainEqual(['due_date', TODAY])
    expect(c.nots).toContainEqual(['status', 'in', '(paid,void,refunded)'])
  })

  it('respects a caller-supplied limit capped at 500', async () => {
    const { db, calls } = makeRecordingDb({ invoices: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listInvoicesConverted(TENANT, { limit: 5000 })

    const c = calls.find((x) => x.table === 'invoices')!
    expect(c.limits).toEqual([500])
  })

  it('propagates a DB error (RLS default-deny surfaces, is not swallowed)', async () => {
    const { db } = makeRecordingDb({
      invoices: new Error('permission denied for table invoices'),
    })
    tenantClientMock.mockReturnValue(db)

    await expect(listInvoicesConverted(TENANT)).rejects.toThrow(/permission denied/)
  })
})
