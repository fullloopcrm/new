import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/DELETE /api/social/accounts.
 *
 * Bug 1 (severe, credential exposure): GET returned the raw stored row
 * including `access_token` -- a live Facebook/Instagram Graph API token --
 * to ANY authenticated tenant member of ANY role. The dashboard UI never
 * reads that field (only platform/account_name/connected_at), so this was
 * a pure over-fetch leaking a long-lived external credential into every
 * page load's network response.
 *
 * Bug 2 (missing-authz, same class fixed repeatedly elsewhere this
 * session): DELETE (disconnect) only checked getTenantForRequest() with
 * zero permission check -- any role, including 'staff', could rip out the
 * tenant's connected social account. Fixed to require settings.integrations
 * (the exact catalog permission built for "manage integrations", owner-only
 * by current default -- matches rbac.ts, not a new policy call).
 *
 * Bug 3 (missing-authz, same class): GET itself had zero permission check
 * either -- the sidebar hides the whole Marketing/Social nav behind
 * campaigns.view, but any authenticated tenant member could hit this route
 * directly and read connected-account info regardless of the tenant's own
 * campaigns.view RBAC override. Fixed to require campaigns.view (the same
 * permission that gates the page in dashboard-shell.tsx).
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

const disconnectSocialAccount = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/social', () => ({
  getSocialAccounts: vi.fn(async () => [
    {
      id: 'acct-1',
      tenant_id: 'tenant-A',
      platform: 'facebook',
      account_id: 'fb-page-1',
      account_name: 'My Business Page',
      access_token: 'EAAG-super-secret-live-graph-api-token',
      token_expires_at: null,
      page_id: 'fb-page-1',
      connected_at: '2026-01-01T00:00:00.000Z',
    },
  ]),
  disconnectSocialAccount,
}))

import { GET, DELETE } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  disconnectSocialAccount.mockClear()
})

describe('GET /api/social/accounts', () => {
  it('never includes access_token in the response', async () => {
    const res = await GET()
    const body = await res.json()

    expect(body.accounts).toHaveLength(1)
    expect(body.accounts[0]).not.toHaveProperty('access_token')
    expect(JSON.stringify(body)).not.toContain('super-secret-live-graph-api-token')
  })

  it('still returns the non-sensitive display fields the UI needs', async () => {
    const res = await GET()
    const body = await res.json()

    expect(body.accounts[0]).toMatchObject({
      platform: 'facebook',
      account_name: 'My Business Page',
      connected_at: '2026-01-01T00:00:00.000Z',
    })
  })

  it("PERMISSION PROBE: 'staff' role (no campaigns.view by default) is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it("owner (has campaigns.view) can read accounts", async () => {
    roleHolder.role = 'owner'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/social/accounts — permission gate', () => {
  const req = (platform: string) =>
    new Request('http://x', { method: 'DELETE', body: JSON.stringify({ platform }) })

  it('owner can disconnect', async () => {
    const res = await DELETE(req('facebook'))
    expect(res.status).toBe(200)
    expect(disconnectSocialAccount).toHaveBeenCalledWith('tenant-A', 'facebook')
  })

  it("PERMISSION PROBE: 'admin' role (no settings.integrations by default) is forbidden", async () => {
    roleHolder.role = 'admin'
    const res = await DELETE(req('facebook'))
    expect(res.status).toBe(403)
    expect(disconnectSocialAccount).not.toHaveBeenCalled()
  })

  it("PERMISSION PROBE: 'staff' role is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await DELETE(req('facebook'))
    expect(res.status).toBe(403)
    expect(disconnectSocialAccount).not.toHaveBeenCalled()
  })
})
