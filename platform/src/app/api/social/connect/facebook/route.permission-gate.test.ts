import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/social/connect/facebook previously called getTenantForRequest()
 * with zero permission check -- any authenticated tenant member, incl.
 * 'staff' (which lacks settings.integrations by default), could kick off the
 * OAuth flow to connect their own Facebook Page as the tenant's integration,
 * hijacking where posts get published. Now gated on settings.integrations.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: { id: TENANT_A } }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/oauth-state', () => ({
  signOAuthState: (tenantId: string) => `signed:${tenantId}`,
}))

import { GET } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  process.env.FACEBOOK_APP_ID = 'test-app-id'
})

describe('GET /api/social/connect/facebook — permission gate', () => {
  it('403s a staff member starting the connect flow', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows an owner (has settings.integrations) to start the connect flow', async () => {
    currentRole.value = 'owner'
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toContain('facebook.com')
  })
})
