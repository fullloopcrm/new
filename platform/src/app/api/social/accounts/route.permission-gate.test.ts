import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * DELETE /api/social/accounts previously called getTenantForRequest() with
 * zero permission check -- any authenticated tenant member, incl. 'staff'
 * (which lacks settings.integrations by default), could disconnect the
 * tenant's live Facebook/Instagram integration. Now gated on
 * settings.integrations, matching how the connect-initiation routes are gated.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

const { currentRole, disconnected } = vi.hoisted(() => ({
  currentRole: { value: 'staff' },
  disconnected: { count: 0 },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: { id: TENANT_A } }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/social', () => ({
  getSocialAccounts: async () => [],
  disconnectSocialAccount: async () => { disconnected.count += 1 },
}))

import { DELETE } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  disconnected.count = 0
})

const deleteReq = (body: unknown) => new Request('http://x/api/social/accounts', { method: 'DELETE', body: JSON.stringify(body) })

describe('DELETE /api/social/accounts — permission gate', () => {
  it('403s a staff member disconnecting an integration, nothing disconnected', async () => {
    const res = await DELETE(deleteReq({ platform: 'facebook' }))
    expect(res.status).toBe(403)
    expect(disconnected.count).toBe(0)
  })

  it('allows an owner (has settings.integrations) to disconnect', async () => {
    currentRole.value = 'owner'
    const res = await DELETE(deleteReq({ platform: 'facebook' }))
    expect(res.status).toBe(200)
    expect(disconnected.count).toBe(1)
  })
})
