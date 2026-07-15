import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard/onboarding — broad-hunt: GET (task list) and PATCH (task
 * status) had zero permission check, only base tenant auth via
 * getTenantForRequest() — despite the route's own doc comment describing
 * this as "Owner-facing onboarding". Any authenticated tenant member of any
 * role, including staff, could view/mutate go-live readiness. Gated on
 * 'settings.edit' (owner/admin only per rbac.ts).
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
vi.mock('@/lib/onboarding-tasks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/onboarding-tasks')>()
  return { ...actual, checkActivationReadiness: async () => ({ ready: false, blockers: [] }) }
})

import { GET, PATCH } from './route'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = {
    onboarding_tasks: [
      { id: 'task-A1', tenant_id: 'tenant-A', task_type: 'domain', status: 'pending', notes: null, completed_at: null },
    ],
  }
})

describe('GET /api/dashboard/onboarding — settings.edit permission', () => {
  it('rejects a staff member (no settings.edit by default)', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows an owner', async () => {
    h.role = 'owner'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('PATCH /api/dashboard/onboarding — settings.edit permission', () => {
  it('rejects a staff member, task left untouched', async () => {
    const res = await PATCH(patchReq({ task_id: 'task-A1', status: 'completed' }))
    expect(res.status).toBe(403)
    expect(h.store.onboarding_tasks[0].status).toBe('pending')
  })

  it('allows an admin', async () => {
    h.role = 'admin'
    const res = await PATCH(patchReq({ task_id: 'task-A1', status: 'completed' }))
    expect(res.status).toBe(200)
  })
})
