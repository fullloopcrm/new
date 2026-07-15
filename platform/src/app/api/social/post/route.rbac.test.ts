import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * social/post POST — permission isolation.
 *
 * BUG (fixed here): published live to the tenant's connected Facebook Page /
 * Instagram Business account via getTenantForRequest() alone (any authenticated
 * role, including 'staff' — rbac.ts grants staff no campaigns.* permission at
 * all). FIX: requirePermission('campaigns.send'), matching the established
 * outbound-broadcast precedent (campaigns/send, sms/send, google/posts).
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

const spies = vi.hoisted(() => ({
  postToFacebook: vi.fn(async () => ({ success: true, postId: 'fb-1' })),
  postToInstagram: vi.fn(async () => ({ success: true, postId: 'ig-1' })),
}))
vi.mock('@/lib/social', () => ({
  postToFacebook: spies.postToFacebook,
  postToInstagram: spies.postToInstagram,
}))

// Real requirePermission + real rbac run against the mocked tenant-query above,
// so a 'staff' role is denied by the ACTUAL permission table, not a stub.
import { POST } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
  spies.postToFacebook.mockClear()
  spies.postToInstagram.mockClear()
})

function post(body: Record<string, unknown>) {
  return POST(new Request('http://t/api/social/post', { method: 'POST', body: JSON.stringify(body) }))
}

describe('social/post POST — permission isolation', () => {
  it('positive control: owner (has campaigns.send) can publish to Facebook', async () => {
    const res = await post({ platform: 'facebook', message: 'hi' })
    expect(res.status).toBe(200)
    expect(spies.postToFacebook).toHaveBeenCalledWith(A, 'hi', undefined)
  })

  it("permission probe: 'staff' (no campaigns.send) is denied 403, nothing published", async () => {
    roleHolder.role = 'staff'
    const res = await post({ platform: 'facebook', message: 'hi' })
    expect(res.status).toBe(403)
    expect(spies.postToFacebook).not.toHaveBeenCalled()
  })

  it("permission probe: 'manager' (no campaigns.send) is denied 403 on Instagram too", async () => {
    roleHolder.role = 'manager'
    const res = await post({ platform: 'instagram', caption: 'c', imageUrl: 'http://img' })
    expect(res.status).toBe(403)
    expect(spies.postToInstagram).not.toHaveBeenCalled()
  })

  it('admin (has campaigns.send) can publish to Instagram', async () => {
    roleHolder.role = 'admin'
    const res = await post({ platform: 'instagram', caption: 'c', imageUrl: 'http://img' })
    expect(res.status).toBe(200)
    expect(spies.postToInstagram).toHaveBeenCalledWith(A, 'c', 'http://img')
  })
})
