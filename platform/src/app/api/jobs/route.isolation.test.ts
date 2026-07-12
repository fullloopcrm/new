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
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
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
