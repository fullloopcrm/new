import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/POST /api/recurring-expenses — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though
 * rbac.ts defines 'finance.expenses' ("Manage expenses") specifically to gate
 * this data, and the sibling /api/finance/expenses route already requires
 * requirePermission('finance.view') on GET / requirePermission(
 * 'finance.expenses') on POST. This was a LIVE bug against the hard-coded
 * role defaults, not just an override edge case: 'manager' is granted
 * 'finance.view' but NOT 'finance.expenses' by default (rbac.ts) — a manager
 * (or staff, who has neither) could read and create recurring expense rows
 * (rent, insurance, software sub amounts) despite the tenant's own stock
 * config drawing that line elsewhere.
 *
 * FIX: requirePermission('finance.view') on GET, requirePermission(
 * 'finance.expenses') on POST — matching /api/finance/expenses exactly.
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

import { GET, POST } from './route'

function seed() {
  return {
    recurring_expenses: [
      { id: 'exp-1', tenant_id: A, label: 'Rent', amount_cents: 250000, frequency: 'monthly', active: true, next_due_date: '2026-08-01' },
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

describe('GET /api/recurring-expenses — permission probe', () => {
  it('owner (has finance.view) can list recurring expenses', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("'staff' (lacks finance.view per default rbac.ts) is blocked from listing recurring expenses", async () => {
    tenantHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'finance.view' from manager via a role_permissions override blocks GET for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { manager: { 'finance.view': false } } },
    }
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('POST /api/recurring-expenses — permission probe', () => {
  const body = () => JSON.stringify({ label: 'Insurance', amount_cents: 50000, frequency: 'monthly' })

  it('owner (has finance.expenses) can create a recurring expense', async () => {
    const res = await POST(new Request('http://t/api/recurring-expenses', { method: 'POST', body: body() }))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (has finance.view but NOT finance.expenses per default rbac.ts) is blocked from creating", async () => {
    tenantHolder.role = 'manager'
    const res = await POST(new Request('http://t/api/recurring-expenses', { method: 'POST', body: body() }))
    expect(res.status).toBe(403)
  })

  it("'staff' (lacks finance.expenses per default rbac.ts) is blocked from creating", async () => {
    tenantHolder.role = 'staff'
    const res = await POST(new Request('http://t/api/recurring-expenses', { method: 'POST', body: body() }))
    expect(res.status).toBe(403)
  })
})
