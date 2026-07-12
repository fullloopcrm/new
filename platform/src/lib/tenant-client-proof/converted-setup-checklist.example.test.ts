import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the setup-checklist conversion: all SIX reads (five counts + one
 * `.limit(1)` existence probe) flow through ONE tenantClient(tenantId), stay tenant-scoped
 * (including the two chained active/status filters), and a missing/denied read on any one
 * table degrades gracefully to 0/false for THAT input only — it does not throw and does not
 * poison the other five.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { setupChecklistCountsConverted } from './converted-setup-checklist.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

type QueryRecord = { table: string; eqs: Array<[string, unknown]>; limits: number[] }

function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, eqs: [], limits: [] }
      calls.push(rec)
      const result = resultsByTable[table] ?? { count: 0, data: [], error: null }
      const builder: Record<string, unknown> = {}
      builder.select = () => builder
      builder.eq = (col: string, val: unknown) => {
        rec.eqs.push([col, val])
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

const ALL_GOOD = {
  clients: { count: 12, error: null },
  service_types: { count: 5, error: null },
  team_members: { count: 3, error: null },
  bookings: { count: 40, error: null },
  campaigns: { count: 2, error: null },
  reviews: { data: [{ id: 'r1' }], error: null },
}

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('setupChecklistCountsConverted', () => {
  it('routes all six reads through ONE tenantClient(tenantId); tenant-scopes every read', async () => {
    const { db, calls } = makeRecordingDb(ALL_GOOD)
    tenantClientMock.mockReturnValue(db)

    const res = await setupChecklistCountsConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    for (const table of ['clients', 'service_types', 'team_members', 'bookings', 'campaigns', 'reviews']) {
      const c = calls.find((x) => x.table === table)!
      expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    }
    expect(res).toEqual({
      clientCount: 12,
      serviceCount: 5,
      teamCount: 3,
      bookingCount: 40,
      campaignCount: 2,
      hasReview: true,
    })
  })

  it('keeps the compound active/status filters on service_types and team_members', async () => {
    const { db, calls } = makeRecordingDb(ALL_GOOD)
    tenantClientMock.mockReturnValue(db)

    await setupChecklistCountsConverted(TENANT)

    expect(calls.find((x) => x.table === 'service_types')!.eqs).toContainEqual(['active', true])
    expect(calls.find((x) => x.table === 'team_members')!.eqs).toContainEqual(['status', 'active'])
  })

  it('reviews probe is capped at limit(1) — an existence check, not a full read', async () => {
    const { db, calls } = makeRecordingDb(ALL_GOOD)
    tenantClientMock.mockReturnValue(db)

    await setupChecklistCountsConverted(TENANT)

    expect(calls.find((x) => x.table === 'reviews')!.limits).toEqual([1])
  })

  it('GRACEFUL DEGRADATION: a denied/missing count (RLS default-deny) reads as 0/false for that field only, others unaffected', async () => {
    const { db } = makeRecordingDb({
      ...ALL_GOOD,
      team_members: { count: null, error: { message: 'permission denied for table team_members' } },
      reviews: { data: null, error: { message: 'permission denied for table reviews' } },
    })
    tenantClientMock.mockReturnValue(db)

    const res = await setupChecklistCountsConverted(TENANT)

    expect(res.teamCount).toBe(0)
    expect(res.hasReview).toBe(false)
    // the other four inputs are untouched by the two denied reads
    expect(res.clientCount).toBe(12)
    expect(res.serviceCount).toBe(5)
    expect(res.bookingCount).toBe(40)
    expect(res.campaignCount).toBe(2)
  })
})
