import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/message-applicants/preview POST — permission isolation.
 *
 * BUG (fixed here): previews who a mass-SMS applicant broadcast would reach,
 * returning every applicant's name + phone (PII). This route only checked
 * for a valid tenant session via getTenantForRequest(), which succeeds for
 * ANY tenant_members row regardless of role — so a 'staff' or 'manager' role
 * (rbac.ts grants neither campaigns.send) could read the full applicant PII
 * list directly via the API, same class as the sibling send route's
 * pre-existing campaigns.send gate.
 *
 * FIX: requirePermission('campaigns.send') before anything else runs.
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

// Real requirePermission + real rbac run against the mocked tenant-query above,
// so a 'staff'/'manager' role is denied by the ACTUAL permission table, not a stub.
import { POST } from './route'

function seed() {
  return {
    cleaner_applications: [
      { id: 'app-a1', tenant_id: A, name: 'Jeff Tucker', phone: '+15559990001', status: 'new', created_at: '2026-01-01' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

describe('admin/message-applicants/preview — permission isolation', () => {
  it('owner can preview the applicant broadcast list', async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.eligible.length + body.excluded.length).toBe(1)
  })

  it("PERMISSION PROBE: 'staff' role (no campaigns.send) is forbidden, gets no applicant PII", async () => {
    roleHolder.role = 'staff'
    const res = await POST()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.eligible).toBeUndefined()
    expect(body.excluded).toBeUndefined()
  })

  it("PERMISSION PROBE: 'manager' role (no campaigns.send) is forbidden", async () => {
    roleHolder.role = 'manager'
    const res = await POST()
    expect(res.status).toBe(403)
  })
})
