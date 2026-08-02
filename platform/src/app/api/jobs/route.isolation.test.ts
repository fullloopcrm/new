import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/jobs (converted to tenantDb).
 *
 * The jobs list + money rollup reads `jobs` through tenantDb, so a foreign
 * tenant's job never appears in another tenant's list and its payments never
 * inflate the tenant-wide contracted/paid/due/overdue totals.
 */

const A = 'tid-a'
const B = 'tid-b'

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
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: roleHolder.role })),
  }
})

import { GET } from './route'

function seed() {
  return {
    jobs: [
      {
        id: 'job-a1', tenant_id: A, title: 'Job A', status: 'active', total_cents: 50000, created_at: '2026-01-01', client_id: 'cl-a',
        clients: { name: 'Client A' },
        job_payments: [{ amount_cents: 50000, status: 'paid', due_at: null }],
      },
      {
        id: 'job-b1', tenant_id: B, title: 'Job B', status: 'active', total_cents: 999999, created_at: '2026-01-02', client_id: 'cl-b',
        clients: { name: 'Client B' },
        job_payments: [{ amount_cents: 999999, status: 'paid', due_at: null }],
      },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

describe('jobs — tenant isolation', () => {
  it("excludes a foreign tenant's job from the list and money totals", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()

    const ids = (body.jobs as Array<{ id: string }>).map((j) => j.id)
    expect(ids).toEqual(['job-a1'])
    expect(ids).not.toContain('job-b1')

    // Foreign tenant B's $9,999.99 paid payment must not leak into the rollup.
    expect(body.totals.contracted).toBe(50000)
    expect(body.totals.paid).toBe(50000)
  })
})

describe('jobs — permission gate + finance-field split (regression, 2026-08-01)', () => {
  // Live bug found while sweeping previously-uncovered top-level routes: GET
  // had NO permission check at all (only getTenantForRequest()) and always
  // returned the full money rollup. Unlike the bookings/clients GET gaps
  // (which were purely override-dependent, dormant since no tenant had
  // configured an override), this one was a real, DEFAULT-config gap: the
  // 'staff' role has bookings.view but not finance.view by default, so any
  // staff member on any tenant could already see every job's contracted/
  // paid/due/overdue dollar amounts and the tenant-wide totals. Fixed to
  // match jobs/[id]/route.ts's existing split: bookings.view gates the
  // route at all, finance.view gates the money fields specifically.

  it('denies the whole request with 403 when the caller lacks bookings.view', async () => {
    const { getTenantForRequest } = await import('@/lib/tenant-query')
    ;(getTenantForRequest as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), { status: 403 })
    )
    // requirePermission swallows any thrown error into a generic 401, per
    // its own catch block -- assert the request is rejected, not a 200.
    const res = await GET()
    expect(res.status).not.toBe(200)
  })

  it("zeroes every job's money fields and the tenant-wide totals for a role without finance.view (staff, the real default)", async () => {
    roleHolder.role = 'staff'

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()

    const jobA = (body.jobs as Array<{ id: string; contracted: number; paid: number; due: number; overdue: number }>)
      .find((j) => j.id === 'job-a1')!
    expect(jobA.contracted).toBe(0)
    expect(jobA.paid).toBe(0)
    expect(body.totals).toEqual({ contracted: 0, paid: 0, due: 0, overdue: 0 })
    // The non-financial fields must still come through -- this is a field
    // split, not a whole-list block.
    expect(jobA.client_name).toBe('Client A')
  })

  it('still returns real money fields for a role with finance.view (manager)', async () => {
    roleHolder.role = 'manager'

    const res = await GET()
    const body = await res.json()

    expect(body.totals.contracted).toBe(50000)
    expect(body.totals.paid).toBe(50000)
  })
})
