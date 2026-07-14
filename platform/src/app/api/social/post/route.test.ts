import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/social/post -- missing-authz. Only checked getTenantForRequest()
 * (any authenticated role), unlike every sibling brand-risk broadcast route
 * fixed this session (campaigns/send, sms/send, admin/find-cleaner/send) which
 * all gate on campaigns.send. Any tenant member, including 'staff' (rbac.ts
 * grants staff no campaigns permission at all), could post live to the
 * tenant's public Facebook/Instagram accounts via the API. Fixed to require
 * campaigns.send, matching the established sibling pattern.
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

const postToFacebook = vi.hoisted(() => vi.fn(async () => ({ success: true, postId: 'post-1' })))
const postToInstagram = vi.hoisted(() => vi.fn(async () => ({ success: true })))
vi.mock('@/lib/social', () => ({ postToFacebook, postToInstagram }))

import { POST } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  postToFacebook.mockClear()
  postToInstagram.mockClear()
})

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/social/post — permission gate', () => {
  it('owner can post to Facebook', async () => {
    const res = await POST(req({ platform: 'facebook', message: 'hello' }))
    expect(res.status).toBe(200)
    expect(postToFacebook).toHaveBeenCalledWith('tenant-A', 'hello', undefined)
  })

  it("PERMISSION PROBE: 'manager' role (campaigns.view only, no campaigns.send) is forbidden and never calls Facebook", async () => {
    roleHolder.role = 'manager'
    const res = await POST(req({ platform: 'facebook', message: 'hijacked post' }))
    expect(res.status).toBe(403)
    expect(postToFacebook).not.toHaveBeenCalled()
  })

  it("PERMISSION PROBE: 'staff' role (no campaigns permission at all) is forbidden for Instagram too", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req({ platform: 'instagram', caption: 'hijacked', imageUrl: 'https://x/y.jpg' }))
    expect(res.status).toBe(403)
    expect(postToInstagram).not.toHaveBeenCalled()
  })
})
