import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Batch 2 isolation proof: each converted read flows through tenantClient(tenantId)
 * (RLS-enforced), NOT supabaseAdmin (RLS bypass), and keeps its explicit tenant_id
 * scope. We mock tenantClient with a recording query builder and assert routing +
 * scope + output shape — not the DB itself.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import {
  bookingStatsConverted,
  financePendingConverted,
  leadsDomainsConverted,
} from './converted-read-routes-batch2.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

type QueryRecord = { table: string; eqs: Array<[string, unknown]> }

/**
 * Chainable, awaitable fake Supabase client that records table + .eq() calls.
 * `resultsByTable` may map a table to a fixed result, or to a queue (array) of
 * results returned in call order (leads/domains hits website_visits twice per domain).
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
      builder.gte = passthrough
      builder.lt = passthrough
      builder.in = passthrough
      builder.or = passthrough
      builder.not = passthrough
      builder.limit = passthrough
      builder.order = passthrough
      builder.eq = (col: string, val: unknown) => {
        rec.eqs.push([col, val])
        return builder
      }
      builder.then = (resolve: (v: unknown) => void) => resolve(result)
      return builder
    },
  }
  return { db, calls }
}

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('bookingStatsConverted', () => {
  it('routes every query through one tenantClient(tenantId), all scoped to bookings+tenant', async () => {
    const { db, calls } = makeRecordingDb({
      bookings: [
        { count: 3, error: null }, // upcoming
        { count: 2, error: null }, // thisWeek
        { count: 5, error: null }, // completed
        { data: [{ price: 100 }, { price: 50 }], error: null }, // paidBookings
      ],
    })
    tenantClientMock.mockReturnValue(db)

    const res = await bookingStatsConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    expect(calls).toHaveLength(4)
    for (const c of calls) {
      expect(c.table).toBe('bookings')
      expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    }
    expect(res).toEqual({ upcoming: 3, thisWeek: 2, completed: 5, revenue: 150 })
  })
})

describe('financePendingConverted', () => {
  it('routes through tenantClient(tenantId), scopes bookings by tenant, and shapes rows', async () => {
    const { db, calls } = makeRecordingDb({
      bookings: {
        data: [
          {
            id: 'b1',
            start_time: '2026-07-01T00:00:00Z',
            price: 200,
            team_member_pay: 80,
            actual_hours: 3,
            payment_status: 'unpaid',
            team_member_paid: false,
            clients: { name: 'Acme' },
            team_members: { name: 'Pat' },
          },
        ],
        error: null,
      },
    })
    tenantClientMock.mockReturnValue(db)

    const res = await financePendingConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    expect(calls[0].table).toBe('bookings')
    expect(calls[0].eqs).toContainEqual(['tenant_id', TENANT])
    expect(res[0]).toEqual({
      id: 'b1',
      date: '2026-07-01T00:00:00Z',
      client_name: 'Acme',
      cleaner_name: 'Pat',
      amount: 200,
      team_member_pay: 80,
      actual_hours: 3,
      payment_status: 'unpaid',
      team_member_paid: false,
    })
  })
})

describe('leadsDomainsConverted', () => {
  it('routes through tenantClient(tenantId), scopes domains by tenant, counts child visits by domain_id', async () => {
    const { db, calls } = makeRecordingDb({
      domains: { data: [{ id: 'd1', host: 'a.com' }], error: null },
      website_visits: [
        { count: 9, error: null }, // visits
        { count: 4, error: null }, // ctas
      ],
    })
    tenantClientMock.mockReturnValue(db)

    const res = await leadsDomainsConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    // Parent domains read is tenant-scoped...
    const domainsCall = calls.find((c) => c.table === 'domains')!
    expect(domainsCall.eqs).toContainEqual(['tenant_id', TENANT])
    // ...child website_visits reads are scoped by domain_id (the flagged dependency).
    const visitCalls = calls.filter((c) => c.table === 'website_visits')
    expect(visitCalls).toHaveLength(2)
    for (const c of visitCalls) {
      expect(c.eqs).toContainEqual(['domain_id', 'd1'])
      expect(c.eqs).not.toContainEqual(['tenant_id', TENANT]) // documents the gap
    }
    expect(res.domains[0]).toMatchObject({ id: 'd1', host: 'a.com', visits: 9, ctas: 4 })
  })
})
