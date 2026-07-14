import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * requirePermission gate probe — social/accounts/route.ts DELETE.
 * Disconnecting a tenant's connected social account had zero permission
 * check -- any authenticated tenant role, including 'staff', could sabotage
 * the integration. Proves DELETE now requires settings.integrations and
 * never disconnects when denied. GET is left as a read-only view (unchanged).
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

let disconnectCalls = 0
vi.mock('@/lib/social', () => ({
  getSocialAccounts: async () => [],
  disconnectSocialAccount: async () => {
    disconnectCalls++
  },
}))

import { DELETE } from './route'

const TENANT_ID = 'tenant-A'

function req(): Request {
  return new Request('http://x', {
    method: 'DELETE',
    body: JSON.stringify({ platform: 'facebook' }),
  })
}

beforeEach(() => {
  currentTenantId = TENANT_ID
  permissionError = null
  disconnectCalls = 0
})

describe('social/accounts DELETE — permission gate', () => {
  it('a caller with settings.integrations can disconnect an account (positive control)', async () => {
    const res = await DELETE(req())
    expect(res.status).toBe(200)
    expect(disconnectCalls).toBe(1)
  })

  it('a role lacking settings.integrations is forbidden and never disconnects the account', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await DELETE(req())
    expect(res.status).toBe(403)
    expect(disconnectCalls).toBe(0)
  })
})
