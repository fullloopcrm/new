import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard/onboarding/activate — tenantDb() conversion wrong-tenant
 * probe (P1/W1 queue-c). Owner-facing go-live action. The "tenant went live"
 * notification must always be stamped with the request's own tenant_id via
 * the wrapper's auto-stamp, never a caller-influenced or missing value.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { name: 'Tenant A' }, role: 'owner' }),
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
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme A', status: 'pending', slug: 'acme-a' }],
    notifications: [],
  }
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
