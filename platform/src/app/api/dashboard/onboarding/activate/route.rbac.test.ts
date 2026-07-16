import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/dashboard/onboarding/activate — permission gate.
 *
 * BUG (fixed here): only called getTenantForRequest() (any authenticated
 * tenant role), with no permission check. This flips a tenant pending →
 * active, turning ON client-facing crons (reminders, review follow-ups) —
 * this route's own doc comment calls that "an explicit, gated action —
 * never an automatic flip," but nothing actually gated who could trigger
 * it. The dashboard-shell.tsx nav hides the whole 'Business Profile' area
 * (this route + ../route.ts + ../profile) behind settings.edit (owner/admin
 * only per rbac.ts) — a manager or staff account could go live directly via
 * API, bypassing that intent.
 *
 * FIX: requirePermission('settings.edit').
 */

const A = 'tid-a'

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

vi.mock('@/lib/onboarding-tasks', () => ({
  checkActivationReadiness: vi.fn(async () => ({ ready: true, tasksRemaining: [], gateBlockers: [] })),
}))

vi.mock('@/lib/vercel-domains', () => ({
  registerCarryingDomain: vi.fn(async () => ({ ok: true, status: 'skipped', domain: 'acme.fullloopcrm.com' })),
}))

const updateSpy = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => {
  const chain = () => {
    const q: Record<string, unknown> = {}
    const self = () => q
    q.select = vi.fn(self)
    q.eq = vi.fn(self)
    q.insert = vi.fn(async () => ({ data: null, error: null }))
    q.update = vi.fn((patch: unknown) => {
      updateSpy(patch)
      return q
    })
    q.single = vi.fn(async () => ({ data: { id: A, name: 'Acme', status: 'active', slug: 'acme' }, error: null }))
    return q
  }
  return { supabaseAdmin: { from: vi.fn(() => chain()) } }
})

import { POST } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
  updateSpy.mockClear()
})

describe('POST /api/dashboard/onboarding/activate — permission probe', () => {
  it('owner (has settings.edit) can activate the tenant', async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    expect(updateSpy).toHaveBeenCalledWith({ status: 'active' })
  })

  it('admin (has settings.edit per rbac.ts) can activate the tenant', async () => {
    roleHolder.role = 'admin'
    const res = await POST()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (no settings.edit) is forbidden, tenant not flipped live", async () => {
    roleHolder.role = 'manager'
    const res = await POST()
    expect(res.status).toBe(403)
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it("PERMISSION PROBE: 'staff' (no settings.edit) is forbidden, tenant not flipped live", async () => {
    roleHolder.role = 'staff'
    const res = await POST()
    expect(res.status).toBe(403)
    expect(updateSpy).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.activated).toBeUndefined()
  })
})
