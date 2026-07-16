import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/PATCH /api/dashboard/onboarding — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (any
 * authenticated tenant role), with no permission check at all. The
 * dashboard-shell.tsx nav gates the whole 'Business Profile' feature (this
 * route + ./profile + ./activate) behind settings.edit — rbac.ts grants
 * settings.edit only to owner/admin, not manager/staff. A manager or staff
 * account could view/mutate onboarding checklist state via direct API call
 * despite the page being hidden from their nav.
 *
 * FIX: requirePermission('settings.edit') on both GET and PATCH.
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
  checkActivationReadiness: vi.fn(async () => ({ ready: false, tasksRemaining: [], gateBlockers: [] })),
}))

vi.mock('@/lib/supabase', () => {
  const chain = () => {
    const q: Record<string, unknown> = {}
    const self = () => q
    q.select = vi.fn(self)
    q.eq = vi.fn(self)
    q.order = vi.fn(self)
    q.update = vi.fn(self)
    q.single = vi.fn(async () => ({ data: { id: 't1', task_type: 'create_stripe', status: 'completed', notes: null, completed_at: null }, error: null }))
    q.then = (resolve: (v: { data: unknown[] }) => void) => resolve({ data: [] })
    return q
  }
  return { supabaseAdmin: { from: vi.fn(() => chain()) } }
})

import { GET, PATCH } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
})

function patch(body: Record<string, unknown>) {
  return PATCH(new Request('http://t/api/dashboard/onboarding', { method: 'PATCH', body: JSON.stringify(body) }))
}

describe('GET /api/dashboard/onboarding — permission probe', () => {
  it('owner (has settings.edit) can load the checklist', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('admin (has settings.edit per rbac.ts) can load the checklist', async () => {
    roleHolder.role = 'admin'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (no settings.edit) is forbidden", async () => {
    roleHolder.role = 'manager'
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.tasks).toBeUndefined()
  })

  it("PERMISSION PROBE: 'staff' (no settings.edit) is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('PATCH /api/dashboard/onboarding — permission probe', () => {
  it('owner can update a task', async () => {
    const res = await patch({ task_id: 't1', status: 'completed' })
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no settings.edit) is forbidden, task not updated", async () => {
    roleHolder.role = 'staff'
    const res = await patch({ task_id: 't1', status: 'completed' })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.task).toBeUndefined()
  })

  it("PERMISSION PROBE: 'manager' (no settings.edit) is forbidden", async () => {
    roleHolder.role = 'manager'
    const res = await patch({ task_id: 't1', status: 'completed' })
    expect(res.status).toBe(403)
  })
})
