import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * management-applications GET/PUT — permission probe.
 *
 * BUG (fixed here): both routes only called getTenantForRequest(), which
 * succeeds for ANY tenant_members row regardless of role. The sibling
 * team-applications route (identical hiring-application shape) requires
 * team.view for GET and team.edit for PUT — this route never got the same
 * gate. Worst case: a 'staff' or 'manager' role (rbac.ts grants team.view
 * only, never team.edit) could view applicant PII (resume/photo/video URLs,
 * phone, email) and approve/reject management hires via a direct API call.
 *
 * FIX: requirePermission('team.view') on GET, requirePermission('team.edit')
 * on PUT, matching the canonical team-applications gate.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

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

import { GET, PUT } from './route'

function seed() {
  return {
    management_applications: [
      { id: 'app-a1', tenant_id: A, name: 'Applicant A', email: 'a@example.com', status: 'pending' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

function putReq(body: Record<string, unknown>) {
  return new Request('http://t', { method: 'PUT', body: JSON.stringify(body) })
}

describe('management-applications GET — permission probe', () => {
  it('owner (has team.view) can list applications', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' role IS allowed (has team.view by default)", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('management-applications PUT — permission probe', () => {
  it('owner can approve/reject an application', async () => {
    const res = await PUT(putReq({ id: 'app-a1', status: 'approved' }))
    expect(res.status).toBe(200)
    const own = h.seed.management_applications.find((a) => a.id === 'app-a1')!
    expect(own.status).toBe('approved')
  })

  it("PERMISSION PROBE: 'staff' role (no team.edit) is forbidden and nothing changes", async () => {
    roleHolder.role = 'staff'
    const res = await PUT(putReq({ id: 'app-a1', status: 'approved' }))
    expect(res.status).toBe(403)
    const own = h.seed.management_applications.find((a) => a.id === 'app-a1')!
    expect(own.status).toBe('pending')
  })

  it("PERMISSION PROBE: 'manager' role (no team.edit) is forbidden and nothing changes", async () => {
    roleHolder.role = 'manager'
    const res = await PUT(putReq({ id: 'app-a1', status: 'approved' }))
    expect(res.status).toBe(403)
    const own = h.seed.management_applications.find((a) => a.id === 'app-a1')!
    expect(own.status).toBe('pending')
  })
})
