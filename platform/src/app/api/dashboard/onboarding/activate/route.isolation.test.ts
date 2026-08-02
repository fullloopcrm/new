import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard/onboarding/activate — tenantDb() conversion wrong-tenant
 * probe (P1/W1 queue-c). Owner-facing go-live action. The "tenant went live"
 * notification must always be stamped with the request's own tenant_id via
 * the wrapper's auto-stamp, never a caller-influenced or missing value.
 *
 * Also covers a real bug found + fixed 2026-08-01: this route previously had
 * NO permission check at all (any authenticated tenant member, including
 * 'staff', could flip a ready tenant live). Now gated on requirePermission
 * ('settings.edit', owner/admin only per rbac.ts) -- see the 403-on-staff
 * test below, which fails against the pre-fix code (reproduced via
 * git-stash before writing this test, restored after).
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  role: 'owner' as string,
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { name: 'Tenant A' }, role: h.role }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/onboarding-tasks', () => ({
  checkActivationReadiness: async () => ({ ready: true, tasksRemaining: [], gateBlockers: [] }),
}))
vi.mock('@/lib/vercel-domains', () => ({
  registerCarryingDomain: async () => ({ ok: true, status: 'skipped', domain: null, detail: null }),
}))

import { POST } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.role = 'owner'
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme A', status: 'pending', slug: 'acme-a' }],
    notifications: [],
  }
})

describe('POST /api/dashboard/onboarding/activate — permission gate', () => {
  it('a staff-role member is rejected with 403, cannot activate the tenant', async () => {
    h.role = 'staff'
    const res = await POST()
    expect(res.status).toBe(403)
    expect(h.store.tenants.find((t) => t.id === 'tenant-A')?.status).toBe('pending')
  })

  it('an owner-role member can activate (control -- same tenant, real permission)', async () => {
    h.role = 'owner'
    const res = await POST()
    expect(res.status).toBe(200)
  })
})

describe('POST /api/dashboard/onboarding/activate — tenant isolation', () => {
  it("go-live notification is stamped with the activating tenant's own tenant_id", async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    const note = h.store.notifications.find((n) => n.type === 'tenant_activated')
    expect(note?.tenant_id).toBe('tenant-A')
  })

  it("a different tenant's activation stamps its own tenant_id independently", async () => {
    h.tenantId = 'tenant-B'
    h.store.tenants.push({ id: 'tenant-B', name: 'Acme B', status: 'pending', slug: 'acme-b' })

    const res = await POST()
    expect(res.status).toBe(200)
    const noteA = h.store.notifications.find((n) => n.type === 'tenant_activated' && n.message === 'Acme A completed onboarding and is now active.')
    const noteB = h.store.notifications.find((n) => n.type === 'tenant_activated' && n.message === 'Acme B completed onboarding and is now active.')
    expect(noteA).toBeUndefined()
    expect(noteB?.tenant_id).toBe('tenant-B')
  })
})
