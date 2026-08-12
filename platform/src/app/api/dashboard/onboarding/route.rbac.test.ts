import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PATCH /api/dashboard/onboarding — permission gate.
 *
 * BUG (fixed here): PATCH only called getTenantForRequest() (any
 * authenticated tenant member, any role) with no requirePermission() check,
 * so a 'staff' role (view-only + can create bookings per rbac.ts) could mark
 * onboarding tasks complete/skipped — steps toward the "Owner-facing go-live"
 * flow this file's own doc comment describes. Fix gated PATCH on the same
 * 'tenant.activate' permission the sibling /activate route now requires
 * (owner/admin by default). GET (read-only checklist view) is intentionally
 * left ungated — this file's scope is the mutating PATCH only.
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
vi.mock('@/lib/onboarding-tasks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/onboarding-tasks')>()
  return { ...actual, checkActivationReadiness: async () => ({ ready: false, blockers: [] }) }
})

// Real requirePermission + real rbac run against the mocked tenant-query above.
import { PATCH } from './route'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  roleHolder.role = 'owner'
  h.store = {
    onboarding_tasks: [
      { id: 'task-A1', tenant_id: 'tenant-A', task_type: 'domain', status: 'pending', notes: null, completed_at: null },
    ],
  }
})

describe('PATCH /api/dashboard/onboarding — permission gate', () => {
  it('positive control: owner (has tenant.activate) can complete a task', async () => {
    const res = await PATCH(patchReq({ task_id: 'task-A1', status: 'completed' }))
    expect(res.status).toBe(200)
    expect(h.store.onboarding_tasks[0].status).toBe('completed')
  })

  it('admin (has tenant.activate) can complete a task', async () => {
    roleHolder.role = 'admin'
    const res = await PATCH(patchReq({ task_id: 'task-A1', status: 'completed' }))
    expect(res.status).toBe(200)
  })

  it("permission probe: staff (no tenant.activate) is denied 403, task untouched", async () => {
    roleHolder.role = 'staff'
    const res = await PATCH(patchReq({ task_id: 'task-A1', status: 'completed' }))
    expect(res.status).toBe(403)
    expect(h.store.onboarding_tasks[0].status).toBe('pending')
  })

  it('virtual_assistant (no tenant.activate) is denied 403', async () => {
    roleHolder.role = 'virtual_assistant'
    const res = await PATCH(patchReq({ task_id: 'task-A1', status: 'completed' }))
    expect(res.status).toBe(403)
  })
})
