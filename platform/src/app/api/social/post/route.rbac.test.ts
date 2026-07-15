import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * requirePermission gate probe — social/post/route.ts.
 * This route posts live content to the tenant's connected Facebook Page /
 * Instagram Business account. It called getTenantForRequest() with zero
 * permission check -- any authenticated tenant role, including 'staff'
 * (which rbac.ts grants no campaigns.* permission at all), could publish
 * arbitrary content to the tenant's public social presence. Proves it now
 * requires campaigns.send and never calls the social API when denied.
 */

let currentTenantId: string
let permissionError: unknown = null
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenant: { id: currentTenantId } }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: currentTenantId }, error: null }
  ),
}))

let postToFacebookCalls = 0
let postToInstagramCalls = 0
vi.mock('@/lib/social', () => ({
  postToFacebook: async () => {
    postToFacebookCalls++
    return { ok: true }
  },
  postToInstagram: async () => {
    postToInstagramCalls++
    return { ok: true }
  },
}))

import { POST } from './route'

const TENANT_ID = 'tenant-A'

function req(body: Record<string, unknown>): Request {
  return new Request('http://x', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  currentTenantId = TENANT_ID
  permissionError = null
  postToFacebookCalls = 0
  postToInstagramCalls = 0
})

describe('social/post POST — permission gate', () => {
  it('a caller with campaigns.send can post to Facebook (positive control)', async () => {
    const res = await POST(req({ platform: 'facebook', message: 'hello' }))
    expect(res.status).toBe(200)
    expect(postToFacebookCalls).toBe(1)
  })

  it('a role lacking campaigns.send is forbidden and never posts to Facebook or Instagram', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await POST(req({ platform: 'facebook', message: 'hello' }))
    expect(res.status).toBe(403)
    expect(postToFacebookCalls).toBe(0)
    expect(postToInstagramCalls).toBe(0)
  })
})
