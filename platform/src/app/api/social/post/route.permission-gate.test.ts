import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/social/post previously called getTenantForRequest() with zero
 * permission check -- any authenticated tenant member, incl. 'staff' (which
 * lacks campaigns.send by default), could post arbitrary content to the
 * tenant's connected live Facebook Page or Instagram Business account.
 * Sibling campaign-send routes (/api/campaigns/[id]/send, /api/campaigns/send)
 * already gate on campaigns.send/campaigns.create; now matched here.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

const { currentRole, posted } = vi.hoisted(() => ({
  currentRole: { value: 'staff' },
  posted: { facebook: 0, instagram: 0 },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/social', () => ({
  postToFacebook: async () => { posted.facebook += 1; return { success: true } },
  postToInstagram: async () => { posted.instagram += 1; return { success: true } },
}))

import { POST } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  posted.facebook = 0
  posted.instagram = 0
})

const postReq = (body: unknown) => new Request('http://x/api/social/post', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/social/post — permission gate', () => {
  it('403s a staff member posting to Facebook, nothing published', async () => {
    const res = await POST(postReq({ platform: 'facebook', message: 'hi' }))
    expect(res.status).toBe(403)
    expect(posted.facebook).toBe(0)
  })

  it('403s a staff member posting to Instagram, nothing published', async () => {
    const res = await POST(postReq({ platform: 'instagram', caption: 'hi', imageUrl: 'http://x/y.png' }))
    expect(res.status).toBe(403)
    expect(posted.instagram).toBe(0)
  })

  it('allows an admin (has campaigns.send) to post', async () => {
    currentRole.value = 'admin'
    const res = await POST(postReq({ platform: 'facebook', message: 'hi' }))
    expect(res.status).toBe(200)
    expect(posted.facebook).toBe(1)
  })
})
