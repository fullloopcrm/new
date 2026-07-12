import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the jobs conversion: the read (jobs + a MIXED-safety embed of
 * clients(name) [tier #1, safe] AND job_payments [tier #28, inversion hazard]) flows through
 * one tenantClient(tenantId), keeps the tenant scope / created-at-desc order / 500 cap, and
 * the post-fetch money rollup is preserved verbatim. The clock is injected so the `overdue`
 * boundary (due_at < now) is deterministic. Cutover HOLD until job_payments is load-bearing
 * is documented in the proof module header.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { listJobsConverted } from './converted-jobs.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const OTHER = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
// Fixed clock so `overdue` (due_at < now) is deterministic: 2026-07-12T00:00:00Z.
const NOW = Date.UTC(2026, 6, 12)
const NOW_ISO = new Date(NOW).toISOString()

type QueryRecord = {
  table: string
  selects: string[]
  eqs: Array<[string, unknown]>
  orders: Array<[string, unknown]>
  limits: number[]
}

function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, selects: [], eqs: [], orders: [], limits: [] }
      calls.push(rec)
      const result = resultsByTable[table] ?? { data: [], error: null }
      const builder: Record<string, unknown> = {}
      builder.select = (cols: string) => { rec.selects.push(cols); return builder }
      builder.eq = (col: string, val: unknown) => { rec.eqs.push([col, val]); return builder }
      builder.order = (col: string, opts?: unknown) => { rec.orders.push([col, opts]); return builder }
      builder.limit = (n: number) => { rec.limits.push(n); return builder }
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

describe('listJobsConverted', () => {
  it('routes through one tenantClient(tenantId); tenant-scoped; keeps BOTH embeds, order, 500 cap', async () => {
    const { db, calls } = makeRecordingDb({ jobs: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listJobsConverted(TENANT, NOW)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'jobs')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    // Both the safe (clients #1) and the hazardous (job_payments #28) embed survive the swap.
    expect(c.selects[0]).toContain('clients(name)')
    expect(c.selects[0]).toContain('job_payments(amount_cents, status, due_at)')
    expect(c.orders).toEqual([['created_at', { ascending: false }]])
    expect(c.limits).toContain(500)
  })

  it('preserves the post-fetch money rollup; overdue uses the injected clock', async () => {
    const jobs = [
      {
        id: 'j1', title: 'Deep clean', status: 'active', created_at: '2026-07-01', client_id: 'c1',
        clients: { name: 'Acme' },
        job_payments: [
          { amount_cents: 10000, status: 'paid', due_at: null },
          { amount_cents: 5000, status: 'invoiced', due_at: '2026-07-01' }, // before NOW -> overdue
          { amount_cents: 3000, status: 'invoiced', due_at: '2026-08-01' }, // after NOW -> due, not overdue
        ],
      },
      {
        id: 'j2', title: '', status: 'done', created_at: '2026-06-01', client_id: null,
        clients: null, job_payments: [],
      },
    ]
    const { db } = makeRecordingDb({ jobs: { data: jobs, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await listJobsConverted(TENANT, NOW)

    expect(res.jobs[0]).toMatchObject({
      id: 'j1', title: 'Deep clean', client_name: 'Acme',
      contracted: 18000, paid: 10000, due: 8000, overdue: 5000,
    })
    // Empty payment set (the job_payments-inversion end state) -> all zeros, no crash.
    expect(res.jobs[1]).toMatchObject({ title: 'Job', client_name: null, contracted: 0, overdue: 0 })
    expect(res.totals).toEqual({ contracted: 18000, paid: 10000, due: 8000, overdue: 5000 })
    // Sanity: the boundary is driven by the injected clock, not wall time.
    expect('2026-07-01' < NOW_ISO).toBe(true)
  })

  it('scopes to the caller tenant, never a second tenant', async () => {
    const { db, calls } = makeRecordingDb({ jobs: { data: [], error: null } })
    tenantClientMock.mockReturnValue(db)

    await listJobsConverted(OTHER, NOW)

    expect(tenantClientMock).toHaveBeenCalledWith(OTHER)
    const c = calls.find((x) => x.table === 'jobs')!
    expect(c.eqs).toContainEqual(['tenant_id', OTHER])
    expect(c.eqs).not.toContainEqual(['tenant_id', TENANT])
  })

  it('surfaces a read error (throws), not swallowed to an empty list', async () => {
    const { db } = makeRecordingDb({ jobs: new Error('permission denied for table jobs') })
    tenantClientMock.mockReturnValue(db)

    await expect(listJobsConverted(TENANT, NOW)).rejects.toThrow(/permission denied/)
  })
})
