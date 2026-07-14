import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard/onboarding — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). Owner-facing setup checklist. Verifies task list + PATCH
 * never cross tenant boundaries even when the caller guesses another
 * tenant's task_id.
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
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { name: 'Tenant A' } }),
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
  h.store = {
    onboarding_tasks: [
      { id: 'task-A1', tenant_id: 'tenant-A', task_type: 'domain', status: 'pending', notes: null, completed_at: null },
      { id: 'task-B1', tenant_id: 'tenant-B', task_type: 'domain', status: 'pending', notes: 'secret', completed_at: null },
    ],
  }
})

describe('GET /api/dashboard/onboarding — tenant isolation', () => {
  it("tenant A's task list never includes tenant B's tasks", async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.tasks.map((t: { id: string }) => t.id)).toEqual(['task-A1'])
    expect(JSON.stringify(json)).not.toContain('secret')
  })
})

describe('PATCH /api/dashboard/onboarding — tenant isolation', () => {
  it("tenant A cannot complete tenant B's task by guessing its task_id", async () => {
    const res = await PATCH(patchReq({ task_id: 'task-B1', status: 'completed' }))
    expect(res.status).toBe(404)
    const task = h.store.onboarding_tasks.find((t) => t.id === 'task-B1')
    expect(task?.status).toBe('pending')
  })

  it("tenant A can complete its own task", async () => {
    const res = await PATCH(patchReq({ task_id: 'task-A1', status: 'completed' }))
    expect(res.status).toBe(200)
    const task = h.store.onboarding_tasks.find((t) => t.id === 'task-A1')
    expect(task?.status).toBe('completed')
  })
})
