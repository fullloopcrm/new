import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 — REGRESSION LOCK for GET /api/jobs/[id] cross-tenant isolation (money path).
 *
 * Same STRUCTURAL class as the sms P1 guard (deploy-prep/idor-scan-note.md,
 * "row-scoped-ok" bucket): the parent `jobs` row is loaded scoped
 * `.eq('tenant_id', tenantId).eq('id', id).single()` with a 404 gate, and ONLY
 * after that gate does the handler fan out to child reads —
 * `job_payments` (money), `bookings`, `job_events`, each now also independently
 * tenant-scoped via tenantDb (defense-in-depth on top of the parent gate).
 *
 * This test pins the SECURE OUTCOME so that regression fails loudly if either
 * layer (the parent gate or the child tenantDb scoping) is ever dropped.
 *
 *   • NEGATIVE: tenant-A requesting tenant-B's job id gets 404 — no job body, no
 *     job_payments amounts, no child rows disclosed.
 *   • POSITIVE CONTROL: the owning tenant still reads its own job WITH its
 *     payment plan, so the scope fixes nothing it shouldn't.
 *
 * Untested before this file — the only prior jobs test is the team-portal
 * lifecycle happy-path. No route change: read-only verification lane.
 */

const CALLER_TENANT = 'tenant-A'
const VICTIM_TENANT = 'tenant-B'
const VICTIM_JOB = 'job-B-victim'
const VICTIM_MONEY = 4200 // cents on tenant-B's deposit — must never reach tenant-A

type Eqs = Record<string, unknown>
const reads: Array<{ table: string; eqs: Eqs; single: boolean }> = []

const jobsStore = [{ id: VICTIM_JOB, tenant_id: VICTIM_TENANT, title: 'Deep clean — Victim Residence', status: 'scheduled' }]
const paymentsStore = [
  { id: 'pay-b-1', tenant_id: VICTIM_TENANT, job_id: VICTIM_JOB, kind: 'deposit', amount_cents: VICTIM_MONEY, status: 'paid', sort_order: 0 },
]
const bookingsStore = [{ id: 'bk-b-1', tenant_id: VICTIM_TENANT, job_id: VICTIM_JOB, status: 'scheduled', start_time: '2026-07-01T10:00:00Z' }]
const eventsStore = [{ id: 'ev-b-1', tenant_id: VICTIM_TENANT, job_id: VICTIM_JOB, kind: 'created', created_at: '2026-06-30T00:00:00Z' }]

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ userId: 'op-a', tenantId: CALLER_TENANT, tenant: {}, role: 'owner' })),
  AuthError: class AuthError extends Error {},
}))

// shapeSession must survive whatever bookings rows come back; keep it identity-ish.
vi.mock('@/lib/jobs', () => ({
  shapeSession: (b: unknown) => b,
  releasePaymentsForEvent: vi.fn(),
  logJobEvent: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  function rowsFor(table: string, eqs: Eqs): unknown[] {
    const src =
      table === 'jobs' ? jobsStore
        : table === 'job_payments' ? paymentsStore
        : table === 'bookings' ? bookingsStore
        : table === 'job_events' ? eventsStore
        : []
    return src.filter((r) => Object.entries(eqs).every(([k, v]) => (r as Eqs)[k] === v))
  }
  function from(table: string) {
    const eqs: Eqs = {}
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
      order: () => chain,
      single: () => {
        reads.push({ table, eqs: { ...eqs }, single: true })
        const rows = rowsFor(table, eqs)
        return Promise.resolve(rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: 'no rows' } })
      },
      then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => {
        reads.push({ table, eqs: { ...eqs }, single: false })
        return Promise.resolve({ data: rowsFor(table, eqs), error: null }).then(onF, onR)
      },
    }
    return chain
  }
  return { supabaseAdmin: { from } }
})

import { GET } from './route'
import { getTenantForRequest } from '@/lib/tenant-query'

const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  reads.length = 0
})

describe('GET /api/jobs/[id] — cross-tenant job + payment isolation', () => {
  it('NEGATIVE (regression lock): tenant-A requesting tenant-B\'s job gets 404, no payment disclosure', async () => {
    const res = await GET(new Request(`https://app.fullloop.example/api/jobs/${VICTIM_JOB}`), params(VICTIM_JOB))
    expect(res.status).toBe(404)

    const body = await res.json()
    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain(String(VICTIM_MONEY))
    expect(serialized).not.toContain('Victim Residence')
    expect(body.payments).toBeUndefined()

    // Structural guarantee 1: the parent read WAS tenant-scoped.
    const jobRead = reads.find((r) => r.table === 'jobs' && r.single)
    expect(jobRead).toBeTruthy()
    expect(jobRead!.eqs).toHaveProperty('tenant_id', CALLER_TENANT)
    expect(jobRead!.eqs).toHaveProperty('id', VICTIM_JOB)

    // Structural guarantee 2: the 404 short-circuited BEFORE any child read ran —
    // job_payments must never have been queried for a cross-tenant id.
    expect(reads.some((r) => r.table === 'job_payments')).toBe(false)
  })

  it('POSITIVE CONTROL: the owning tenant reads its own job with its payment plan', async () => {
    vi.mocked(getTenantForRequest).mockResolvedValueOnce({ userId: 'op-b', tenantId: VICTIM_TENANT, tenant: {}, role: 'owner' } as never)

    const res = await GET(new Request(`https://app.fullloop.example/api/jobs/${VICTIM_JOB}`), params(VICTIM_JOB))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.job).toBeTruthy()
    expect(body.job.title).toContain('Victim Residence')
    expect(body.payments).toHaveLength(1)
    expect(body.payments[0].amount_cents).toBe(VICTIM_MONEY)
  })
})
