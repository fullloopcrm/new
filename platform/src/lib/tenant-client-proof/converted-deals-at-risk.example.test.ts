import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the deals/at-risk conversion: three INDEPENDENT reads (clients,
 * bookings, deals) all flow through ONE tenantClient(tenantId), each is tenant-scoped, and
 * the pure-JS bucketing (workable / withUpcoming / onBoard) is unchanged by the swap. Also
 * pins the graceful-degradation shape: a default-denied `deals` table (=> []) collapses
 * onSalesBoard, it does not null a sub-object (the fan-out class, not the embed class).
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listAtRiskConverted } from './converted-deals-at-risk.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const NOW = new Date('2026-07-12T00:00:00Z')
const PAST = '2026-01-01T00:00:00Z'
const FUTURE = '2026-12-01T00:00:00Z'

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
      builder.neq = passthrough
      builder.in = passthrough
      builder.order = passthrough
      builder.limit = passthrough
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

const CLIENTS = [
  { id: 'c1', name: 'Past Only', status: 'active', created_at: PAST },
  { id: 'c2', name: 'Upcoming', status: 'active', created_at: PAST },
  { id: 'c3', name: 'On Board', status: 'active', created_at: PAST },
]
const BOOKINGS = [
  { client_id: 'c1', start_time: PAST, status: 'completed', price: 200 },
  { client_id: 'c2', start_time: FUTURE, status: 'scheduled', price: 150 },
]

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('listAtRiskConverted', () => {
  it('routes all three reads through ONE tenantClient(tenantId); each tenant-scoped; buckets correctly', async () => {
    const { db, calls } = makeRecordingDb({
      clients: { data: CLIENTS, error: null },
      bookings: { data: BOOKINGS, error: null },
      deals: { data: [{ client_id: 'c3' }], error: null },
    })
    tenantClientMock.mockReturnValue(db)

    const res = await listAtRiskConverted(TENANT, NOW)

    // One client instance minted, reused for all three reads.
    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    // Every table read carries the tenant scope.
    for (const table of ['clients', 'bookings', 'deals']) {
      const c = calls.find((x) => x.table === table)!
      expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    }
    // JS bucketing intact after the swap.
    expect(res.totalClients).toBe(3)
    expect(res.workable.map((c) => c.id)).toEqual(['c1'])
    expect(res.withUpcoming.map((c) => c.id)).toEqual(['c2'])
    expect(res.onBoard.map((c) => c.id)).toEqual(['c3'])
    // c1's completed booking rolled up.
    expect(res.workable[0]).toMatchObject({ totalBookings: 1, totalSpent: 200 })
  })

  it('degrades gracefully when deals default-denies to [] (onSalesBoard collapses; no null sub-object)', async () => {
    const { db } = makeRecordingDb({
      clients: { data: CLIENTS, error: null },
      bookings: { data: BOOKINGS, error: null },
      deals: { data: [], error: null }, // RLS default-deny on an INDEPENDENT read => whole table empty
    })
    tenantClientMock.mockReturnValue(db)

    const res = await listAtRiskConverted(TENANT, NOW)

    // c3 was only "onBoard" via deals; with deals empty it falls through to workable.
    expect(res.onBoard).toEqual([])
    expect(res.workable.map((c) => c.id)).toEqual(['c1', 'c3'])
    expect(res.withUpcoming.map((c) => c.id)).toEqual(['c2'])
  })
})
