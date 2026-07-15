import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * requirePermission gate probe — google/auth/route.ts GET.
 * Called getTenantForRequest() directly with zero permission check, even
 * though the dashboard nav gates the Google page under Marketing on
 * campaigns.view. Any authenticated tenant member — including staff, which
 * has no campaigns.view per rbac.ts — could initiate the Google Business
 * OAuth connect flow. Proves GET now requires campaigns.view and
 * short-circuits when denied.
 */

const TENANT_ID = 'tenant-A'
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: TENANT_ID, tenant: { id: TENANT_ID, name: 'Test Co' }, role: 'staff', userId: 'u1' }, error: null }
  ),
}))

import { GET as authGET } from './route'

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  permissionError = null
  process.env.GOOGLE_CLIENT_ID = 'test-client-id'
  process.env.ADMIN_TOKEN_SECRET = 'test-secret'
})

describe('GET /api/google/auth — campaigns.view permission gate', () => {
  it('allowed with campaigns.view, forbidden without', async () => {
    const ok = await authGET()
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await authGET()
    expect(denied.status).toBe(403)
  })
})
