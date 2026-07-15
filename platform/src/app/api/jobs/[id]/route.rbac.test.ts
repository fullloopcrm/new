import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * jobs/[id] PATCH — permission probe.
 *
 * BUG (fixed here): this route only called getTenantForRequest(), which
 * succeeds for ANY tenant_members row regardless of role. A 'staff' role
 * (rbac.ts grants staff bookings.view/bookings.create only, never
 * bookings.edit) could edit a job's title/notes/dates AND flip its status to
 * 'completed' — which calls releasePaymentsForEvent() and flips any
 * stage-gated PENDING job_payments row to 'invoiced' (due to collect), the
 * same money-releasing side effect the sibling jobs/[id]/payments route
 * gates behind finance.expenses. Same missing-authz class already fixed this
 * session on bookings/[id]/payment, schedules, campaigns, referrals, etc.
 *
 * FIX: requirePermission('bookings.edit') before the update, matching the
 * canonical bookings/[id] PATCH gate.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: { id: A },
      role: roleHolder.role,
    })),
  }
})

// Real requirePermission + real rbac run against the mocked tenant-query above,
// so a 'staff' role is denied by the ACTUAL permission table, not a stub.
import { PATCH } from './route'

function seed() {
  return {
    jobs: [{ id: 'job-a1', tenant_id: A, title: 'A Job', status: 'in_progress', total_cents: 50000 }],
    job_payments: [
      { id: 'pay-1', tenant_id: A, job_id: 'job-a1', trigger: 'on_stage_complete', status: 'pending', amount_cents: 25000, label: 'Final' },
    ],
    job_events: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}
function req(body: Record<string, unknown>) {
  return new Request('http://t', { method: 'PATCH', body: JSON.stringify(body) })
}

describe('jobs/[id] PATCH — permission probe', () => {
  it('owner can edit the job', async () => {
    const res = await PATCH(req({ title: 'Renamed' }), params('job-a1'))
    expect(res.status).toBe(200)
    const own = h.seed.jobs.find((j) => j.id === 'job-a1')!
    expect(own.title).toBe('Renamed')
  })

  it("PERMISSION PROBE: 'staff' role (no bookings.edit) is forbidden and nothing changes", async () => {
    roleHolder.role = 'staff'
    const res = await PATCH(req({ title: 'Hijacked' }), params('job-a1'))
    expect(res.status).toBe(403)
    const own = h.seed.jobs.find((j) => j.id === 'job-a1')!
    expect(own.title).toBe('A Job')
  })

  it("PERMISSION PROBE: 'staff' cannot flip status to 'completed' to release a stage-gated payment", async () => {
    roleHolder.role = 'staff'
    const res = await PATCH(req({ status: 'completed' }), params('job-a1'))
    expect(res.status).toBe(403)
    const job = h.seed.jobs.find((j) => j.id === 'job-a1')!
    expect(job.status).toBe('in_progress')
    const payment = h.seed.job_payments.find((p) => p.id === 'pay-1')!
    expect(payment.status).toBe('pending')
  })
})
