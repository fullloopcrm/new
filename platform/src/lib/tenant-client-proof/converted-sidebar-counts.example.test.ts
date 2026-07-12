import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the sidebar-counts conversion: every count flows through one
 * tenantClient(tenantId) (RLS-enforced), NOT supabaseAdmin (RLS bypass), and the four parent
 * counts stay tenant-scoped. We ALSO pin the silent-degradation hazard: a throwing connect
 * sub-block (what an RLS default-deny looks like) is swallowed and reports connect:0 while the
 * rest of the counts return — the exact masking behavior flagged in the .example.ts header.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { sidebarCountsConverted } from './converted-sidebar-counts.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const USER = 'user-7'

type QueryRecord = { table: string; eqs: Array<[string, unknown]> }

/**
 * resultsByTable value may be a fixed result, a queue (array) consumed in call order, or an
 * Error instance (the awaited query then REJECTS — simulating an RLS default-deny).
 */
function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const queues: Record<string, unknown[]> = {}
  for (const [t, v] of Object.entries(resultsByTable)) {
    if (Array.isArray(v)) queues[t] = [...v]
  }
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, eqs: [] }
      calls.push(rec)
      const fixed = resultsByTable[table]
      const result = Array.isArray(fixed)
        ? (queues[table].shift() ?? { data: [], error: null, count: 0 })
        : (fixed ?? { data: [], error: null, count: 0 })
      const builder: Record<string, unknown> = {}
      const passthrough = () => builder
      builder.select = passthrough
      builder.in = passthrough
      builder.gt = passthrough
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

const PARENT_COUNTS = {
  clients: { count: 11, error: null },
  bookings: { count: 4, error: null },
  website_visits: { count: 20, error: null },
  notifications: { count: 2, error: null },
}

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('sidebarCountsConverted', () => {
  it('routes through one tenantClient(tenantId); tenant-scopes all four parent counts; tallies connect', async () => {
    const { db, calls } = makeRecordingDb({
      ...PARENT_COUNTS,
      connect_channels: { data: [{ id: 'ch1' }], error: null },
      connect_read_cursors: { data: [], error: null },
      connect_messages: [{ count: 5, error: null }],
    })
    tenantClientMock.mockReturnValue(db)

    const res = await sidebarCountsConverted(TENANT, USER)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    for (const table of ['clients', 'bookings', 'website_visits', 'notifications']) {
      const c = calls.find((x) => x.table === table)!
      expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    }
    expect(res).toEqual({ clients: 11, bookings: 4, leads: 20, notifications: 2, connect: 1 })
  })

  it('SILENT-DEGRADATION HAZARD: a throwing connect read (RLS default-deny) is swallowed → connect:0, other counts intact', async () => {
    const { db } = makeRecordingDb({
      ...PARENT_COUNTS,
      connect_channels: new Error('permission denied for table connect_channels'), // what RLS deny looks like
    })
    tenantClientMock.mockReturnValue(db)

    const res = await sidebarCountsConverted(TENANT, USER)

    // The masking is the point: no throw surfaces, connect silently reads 0.
    expect(res.connect).toBe(0)
    expect(res.clients).toBe(11)
    expect(res.notifications).toBe(2)
  })
})
