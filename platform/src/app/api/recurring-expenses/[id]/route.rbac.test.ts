import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PATCH/DELETE /api/recurring-expenses/[id] — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check. rbac.ts defines
 * 'finance.expenses' ("Manage expenses") specifically to gate mutation of
 * this data — 'manager' is granted 'finance.view' but NOT 'finance.expenses'
 * by default, so a manager (or staff, who has neither) could edit or delete
 * any recurring expense row directly via API despite lacking the permission
 * the tenant's own stock config uses to draw that line.
 *
 * FIX: requirePermission('finance.expenses') on PATCH and DELETE, matching
 * the sibling /api/finance/expenses convention and /api/recurring-expenses
 * (collection route)'s POST gate.
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

import { PATCH, DELETE } from './route'

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

const params = () => Promise.resolve({ id: 'exp-1' })

describe('PATCH /api/recurring-expenses/[id] — permission probe', () => {
  it('owner (has finance.expenses) can edit a recurring expense', async () => {
    const res = await PATCH(
      new Request('http://t/api/recurring-expenses/exp-1', { method: 'PATCH', body: JSON.stringify({ label: 'Updated Rent' }) }),
      { params: params() }
    )
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (has finance.view but NOT finance.expenses per default rbac.ts) is blocked from editing", async () => {
    tenantHolder.role = 'manager'
    const res = await PATCH(
      new Request('http://t/api/recurring-expenses/exp-1', { method: 'PATCH', body: JSON.stringify({ label: 'Updated Rent' }) }),
      { params: params() }
    )
    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/recurring-expenses/[id] — permission probe', () => {
  it('owner (has finance.expenses) can delete a recurring expense', async () => {
    const res = await DELETE(new Request('http://t/api/recurring-expenses/exp-1', { method: 'DELETE' }), { params: params() })
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (has finance.view but NOT finance.expenses per default rbac.ts) is blocked from deleting", async () => {
    tenantHolder.role = 'manager'
    const res = await DELETE(new Request('http://t/api/recurring-expenses/exp-1', { method: 'DELETE' }), { params: params() })
    expect(res.status).toBe(403)
  })
})
