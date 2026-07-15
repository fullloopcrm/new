import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/dashboard/onboarding/activate — broad-hunt: flips the tenant
 * pending→active (turns on client-facing crons: reminders, review
 * follow-ups) but had zero permission check, only base tenant auth via
 * getTenantForRequest(). Any authenticated tenant member of any role could
 * take the business live. Gated on 'settings.edit' (owner/admin only).
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { selena_config: null }, role: h.role }),
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
  h.role = 'staff'
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme A', status: 'pending', slug: 'acme-a' }],
    notifications: [],
  }
})

describe('POST /api/dashboard/onboarding/activate — settings.edit permission', () => {
  it('rejects a staff member, tenant stays pending', async () => {
    const res = await POST()
    expect(res.status).toBe(403)
    expect(h.store.tenants[0].status).toBe('pending')
  })

  it('allows an owner to go live', async () => {
    h.role = 'owner'
    const res = await POST()
    expect(res.status).toBe(200)
    expect(h.store.tenants[0].status).toBe('active')
  })
})
