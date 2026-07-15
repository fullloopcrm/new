import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/social/posts.
 *
 * Missing-authz (same class fixed repeatedly elsewhere this session): GET
 * only checked getTenantForRequest() with zero permission check -- any
 * authenticated tenant member of ANY role, including 'staff', could read
 * every social_posts row (marketing post content/scheduling) for the
 * tenant. The sidebar hides the whole Marketing/Social nav behind
 * campaigns.view (dashboard-shell.tsx), so this bypassed the tenant's own
 * campaigns.view RBAC override. Fixed to require campaigns.view.
 */

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string, tenantId: 'tenant-A' as string }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: roleHolder.tenantId,
      tenant: { id: roleHolder.tenantId },
      role: roleHolder.role,
    })),
  }
})

vi.mock('@/lib/social', () => ({
  getSocialPosts: vi.fn(async () => [
    { id: 'post-1', tenant_id: 'tenant-A', platform: 'facebook', message: 'hello world', created_at: '2026-01-01T00:00:00.000Z' },
  ]),
}))

import { GET } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
})

describe('GET /api/social/posts — permission gate', () => {
  it("PERMISSION PROBE: 'staff' role (no campaigns.view by default) is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: 'admin' role (has campaigns.view by default) can read", async () => {
    roleHolder.role = 'admin'
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.posts).toHaveLength(1)
  })

  it('owner can read posts', async () => {
    roleHolder.role = 'owner'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})
