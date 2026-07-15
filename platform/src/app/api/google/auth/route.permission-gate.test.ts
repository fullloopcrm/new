import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/google/auth (mints the Google Business Profile OAuth connect URL)
 * previously called getTenantForRequest() with zero permission check -- any
 * authenticated tenant member, incl. 'staff' (which lacks settings.integrations
 * by default), could hijack the OAuth connect flow for the tenant's Google
 * Business Profile. Now gated on settings.integrations, matching the sibling
 * social/connect/{facebook,instagram} routes.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

const { currentRole } = vi.hoisted(() => ({
  currentRole: { value: 'staff' },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: { id: TENANT_A } }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/oauth-state', () => ({
  signOAuthState: (tenantId: string) => `signed-${tenantId}`,
}))

import { GET } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  process.env.GOOGLE_CLIENT_ID = 'test-client-id'
})

describe('GET /api/google/auth — permission gate', () => {
  it('403s a staff member initiating the Google OAuth connect flow', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows an owner (has settings.integrations) to initiate the connect flow', async () => {
    currentRole.value = 'owner'
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toContain('accounts.google.com')
  })
})
