import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * POST /api/google/posts — missing-authz. Only checked getTenantForRequest()
 * (any authenticated role), unlike the sibling live-publish route
 * (social/post -> campaigns.send). Publishing a Google Business Profile post
 * has no draft/approval step, so any tenant member -- including 'staff' and
 * 'manager' (neither has campaigns.send per rbac.ts) -- could publish live
 * content to the tenant's public Google listing via the API. Fixed to
 * require campaigns.send, matching social/post's established convention.
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

const createGooglePost = vi.hoisted(() => vi.fn(async () => ({ success: true })))
const generateGooglePost = vi.hoisted(() => vi.fn(async () => 'generated draft'))
const getGooglePosts = vi.hoisted(() => vi.fn(async () => []))
vi.mock('@/lib/google-posts', () => ({ createGooglePost, generateGooglePost, getGooglePosts }))

import { POST } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  createGooglePost.mockClear()
  generateGooglePost.mockClear()
})

const req = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/google/posts — permission gate', () => {
  it('owner can publish a Google Business post', async () => {
    const res = await POST(req({ summary: 'We are open!' }))
    expect(res.status).toBe(201)
    expect(createGooglePost).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-A', summary: 'We are open!' }),
    )
  })

  it("PERMISSION PROBE: 'staff' role (no campaigns permission at all) is forbidden and never publishes", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req({ summary: 'hijacked post' }))
    expect(res.status).toBe(403)
    expect(createGooglePost).not.toHaveBeenCalled()
  })

  it("PERMISSION PROBE: 'manager' role (campaigns.view only, no campaigns.send) is forbidden, including AI-draft generation", async () => {
    roleHolder.role = 'manager'
    const res = await POST(req({ generateAI: true, topic: 'spring special' }))
    expect(res.status).toBe(403)
    expect(generateGooglePost).not.toHaveBeenCalled()
  })
})
