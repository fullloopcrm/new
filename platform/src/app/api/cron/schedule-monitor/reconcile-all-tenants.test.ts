import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * bsr-03: the self-healing reconcile step (auto-resolves a schedule_issues
 * row once the condition that created it clears) used to live INSIDE the
 * `if (isNycMaid(tenantId))` block, so it only ever ran for the one nycmaid
 * tenant. Live-verified the real effect in prod 2026-07-31: 29 open
 * unscheduled_sale issues existed platform-wide against only 7 real
 * currently-pending bookings -- every other tenant's Schedule Issues panel
 * just accumulated stale "needs scheduling" alerts forever, because nothing
 * ever cleared them once the underlying booking got scheduled or cancelled.
 * This proves the fix (moving reconcile outside the isNycMaid gate, with a
 * type-guard so nycmaid-only check types like no_show never get incorrectly
 * auto-resolved for a tenant whose `issues` this run never recomputed them).
 */

const TENANT_ID = 'tenant-not-nycmaid' // deliberately not NYCMAID_TENANT_ID

process.env.CRON_SECRET = 'test-secret'

let seededIssues: Array<{ id: string; tenant_id: string; type: string; message: string; date: string | null; status: string }>
const updatedIds: string[][] = []
const insertedIssues: Array<Record<string, unknown>> = []

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let inIds: string[] | null = null
  const resolve = () => {
    if (table === 'tenants') {
      return { data: [{ id: TENANT_ID, name: 'Not NYC Maid', timezone: 'America/New_York' }] }
    }
    if (table === 'bookings') {
      return { data: [] } // no live bookings at all -- the pending sale is long gone
    }
    if (table === 'jobs') {
      return { data: [] }
    }
    if (table === 'schedule_issues') {
      return { data: seededIssues.filter((i) => i.tenant_id === eqs.tenant_id) }
    }
    return { data: [] }
  }
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
    in: (col: string, vals: string[]) => { if (col === 'status') inIds = vals; return chain },
    gte: () => chain,
    lte: () => chain,
    lt: () => chain,
    is: () => chain,
    neq: () => chain,
    or: () => chain,
    limit: async () => resolve(),
    insert: (row: Record<string, unknown>) => {
      if (table === 'schedule_issues') insertedIssues.push(row)
      return Promise.resolve({ data: null, error: null }).then(() => {}, () => {})
    },
    update: (payload: Record<string, unknown>) => {
      const updateChain = {
        in: (_col: string, ids: string[]) => {
          if (table === 'schedule_issues' && payload.status === 'resolved') {
            updatedIds.push(ids)
            for (const id of ids) {
              const row = seededIssues.find((i) => i.id === id)
              if (row) row.status = 'resolved'
            }
          }
          return { then: (onFulfilled: (v: unknown) => void, onRejected: (e: unknown) => void) => Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected) }
        },
      }
      return updateChain
    },
    then: (onFulfilled: (v: unknown) => void) => onFulfilled(resolve()),
  }
  void inIds
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import { GET } from './route'

beforeEach(() => {
  seededIssues = []
  updatedIds.length = 0
  insertedIssues.length = 0
})

function makeRequest(): Request {
  return new Request('http://localhost/api/cron/schedule-monitor', {
    headers: { authorization: 'Bearer test-secret' },
  })
}

describe('schedule-monitor — self-healing reconcile runs for every tenant, not just nycmaid', () => {
  it('auto-resolves a stale open unscheduled_sale issue for a non-nycmaid tenant', async () => {
    seededIssues = [{
      id: 'issue-stale', tenant_id: TENANT_ID, type: 'unscheduled_sale',
      message: 'Sold: Old Client (#deadbeef) — confirm the date', date: null, status: 'open',
    }]

    await GET(makeRequest())

    const resolvedIssue = seededIssues.find((i) => i.id === 'issue-stale')
    expect(resolvedIssue?.status).toBe('resolved')
    expect(updatedIds.flat()).toContain('issue-stale')
  })

  it('never auto-resolves an nycmaid-only-type issue for a non-nycmaid tenant (guard holds even though it was never recomputed)', async () => {
    // A no_show/tight_buffer/etc row should, in real prod, never exist for a
    // non-nycmaid tenant (confirmed live 2026-07-31: zero such rows). But if
    // one somehow did, this tenant's `issues` array never recomputes that
    // type at all -- absence from validMessages must NOT be read as
    // "condition cleared" for these types outside nycmaid.
    seededIssues = [{
      id: 'issue-nycmaid-only-type', tenant_id: TENANT_ID, type: 'no_show',
      message: 'Someone never checked in for someone', date: null, status: 'open',
    }]

    await GET(makeRequest())

    const row = seededIssues.find((i) => i.id === 'issue-nycmaid-only-type')
    expect(row?.status).toBe('open') // untouched
    expect(updatedIds.flat()).not.toContain('issue-nycmaid-only-type')
  })
})
