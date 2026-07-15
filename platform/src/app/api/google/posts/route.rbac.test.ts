import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * google/posts POST — permission isolation.
 *
 * BUG (fixed here): published live to the tenant's Google Business Profile via
 * getTenantForRequest() alone (any authenticated role, including 'staff').
 * FIX: requirePermission('campaigns.send'), mirroring social/post — no
 * draft/approval step, so mapped to the same outbound-broadcast permission.
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
  createGooglePost: vi.fn(async () => ({ success: true })),
  generateGooglePost: vi.fn(async () => 'AI draft'),
  getGooglePosts: vi.fn(async () => []),
}))
vi.mock('@/lib/google-posts', () => ({
  createGooglePost: spies.createGooglePost,
  generateGooglePost: spies.generateGooglePost,
  getGooglePosts: spies.getGooglePosts,
}))

import { POST } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
  spies.createGooglePost.mockClear()
})

function post(body: Record<string, unknown>) {
  return POST(new NextRequest('http://t/api/google/posts', { method: 'POST', body: JSON.stringify(body) }))
}

describe('google/posts POST — permission isolation', () => {
  it('positive control: owner (has campaigns.send) can publish a live Google Business post', async () => {
    const res = await post({ summary: 'hello world' })
    expect(res.status).toBe(201)
    expect(spies.createGooglePost).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: A, summary: 'hello world' }),
    )
  })

  it("permission probe: 'staff' (no campaigns.send) is denied 403, nothing published", async () => {
    roleHolder.role = 'staff'
    const res = await post({ summary: 'hello world' })
    expect(res.status).toBe(403)
    expect(spies.createGooglePost).not.toHaveBeenCalled()
  })

  it("permission probe: 'manager' (no campaigns.send) is denied 403", async () => {
    roleHolder.role = 'manager'
    const res = await post({ summary: 'hello world' })
    expect(res.status).toBe(403)
    expect(spies.createGooglePost).not.toHaveBeenCalled()
  })
})
