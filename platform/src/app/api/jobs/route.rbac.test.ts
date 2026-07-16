import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/jobs — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though its
 * entire response is a money rollup (per-job + tenant-wide contracted/paid/
 * due/overdue totals) — the exact same category of data every other
 * money-reporting endpoint (finance/summary, finance/pnl, recurring-expenses,
 * invoices) already gates behind 'finance.view'. By default rbac.ts grants
 * 'finance.view' to owner/admin/manager only -- 'staff' gets none of
 * finance.* -- so any staff-tier member could already read every job's full
 * financial rollup, with zero role check, no override needed -- same class
 * as P70/P76-P81.
 *
 * FIX: requirePermission('finance.view') on GET, matching the convention
 * already used by every sibling money-reporting endpoint.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a' } as Record<string, unknown>,
}))
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
      tenant: tenantHolder.tenant,
      role: tenantHolder.role,
    })),
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
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

describe('GET /api/jobs — permission probe', () => {
  it('owner (has finance.view) can read the money rollup', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("'manager' (has finance.view per default rbac.ts) can read the money rollup", async () => {
    tenantHolder.role = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no finance.view per default rbac.ts, no override needed) is forbidden from reading the money rollup", async () => {
    tenantHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'finance.view' from admin via a role_permissions override blocks GET for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { admin: { 'finance.view': false } } },
    }
    const res = await GET()
    expect(res.status).toBe(403)
  })
})
