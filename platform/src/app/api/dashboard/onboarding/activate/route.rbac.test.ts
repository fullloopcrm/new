import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/dashboard/onboarding/activate — permission gate.
 *
 * BUG (fixed here): this route only called getTenantForRequest() (any
 * authenticated tenant member, any role) with no requirePermission() check,
 * even though flipping a tenant pending -> active turns on live
 * client-facing crons (reminders, review follow-ups) — this file's own doc
 * comment calls it an "Owner-facing go-live action." A 'staff' role (the
 * lowest tier, view-only + can create bookings per rbac.ts) could activate
 * a tenant. Fix added a new 'tenant.activate' permission, granted by
 * default only to owner/admin, and gated this route on it.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { name: 'Tenant A' }, role: roleHolder.role }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/onboarding-tasks', () => ({
  checkActivationReadiness: async () => ({ ready: true, tasksRemaining: [], gateBlockers: [] }),
}))
vi.mock('@/lib/vercel-domains', () => ({
  registerCarryingDomain: async () => ({ ok: true, status: 'skipped', domain: null, detail: null }),
}))

// Real requirePermission + real rbac run against the mocked tenant-query above.
import { POST } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  roleHolder.role = 'owner'
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme A', status: 'pending', slug: 'acme-a' }],
    notifications: [],
  }
})

describe('POST /api/dashboard/onboarding/activate — permission gate', () => {
  it('positive control: owner (has tenant.activate) can activate', async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    const tenant = h.store.tenants.find((t) => t.id === 'tenant-A')
    expect(tenant?.status).toBe('active')
  })

  it('admin (has tenant.activate) can activate', async () => {
    roleHolder.role = 'admin'
    const res = await POST()
    expect(res.status).toBe(200)
  })

  it("permission probe: staff (no tenant.activate) is denied 403, tenant status untouched", async () => {
    roleHolder.role = 'staff'
    const res = await POST()
    expect(res.status).toBe(403)
    const tenant = h.store.tenants.find((t) => t.id === 'tenant-A')
    expect(tenant?.status).toBe('pending')
  })

  it('manager (no tenant.activate) is denied 403', async () => {
    roleHolder.role = 'manager'
    const res = await POST()
    expect(res.status).toBe(403)
  })
})
