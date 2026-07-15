import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * social/accounts — token-leak fix + permission isolation.
 *
 * BUGS (fixed here):
 * 1. GET returned the raw social_accounts row, including access_token — a live
 *    Facebook/Instagram Graph API credential — to ANY authenticated tenant
 *    member. The dashboard UI only reads platform/account_name/connected_at.
 * 2. DELETE (disconnect) only checked getTenantForRequest() (any role),
 *    unlike sibling broadcast/integration routes. FIX: requirePermission
 *    ('settings.integrations'), matching the permission catalog's own
 *    description ("Manage integrations").
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
  getSocialAccounts: vi.fn(async () => [
    {
      id: 'acc-1',
      tenant_id: A,
      platform: 'facebook',
      account_id: 'fb-acct',
      account_name: 'My Page',
      access_token: 'SUPER-SECRET-LIVE-TOKEN',
      token_expires_at: null,
      page_id: 'pg-1',
      connected_at: '2026-01-01',
    },
  ]),
  disconnectSocialAccount: vi.fn(async () => undefined),
}))
vi.mock('@/lib/social', () => ({
  getSocialAccounts: spies.getSocialAccounts,
  disconnectSocialAccount: spies.disconnectSocialAccount,
}))

import { GET, DELETE } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
  spies.disconnectSocialAccount.mockClear()
})

describe('social/accounts GET — no token leak', () => {
  it('never includes access_token in the response, even for a fully-permitted owner', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.accounts).toHaveLength(1)
    expect(body.accounts[0]).not.toHaveProperty('access_token')
    expect(JSON.stringify(body)).not.toContain('SUPER-SECRET-LIVE-TOKEN')
    // Display fields the dashboard actually needs are preserved
    expect(body.accounts[0]).toMatchObject({ platform: 'facebook', account_name: 'My Page' })
  })
})

describe('social/accounts DELETE — permission isolation', () => {
  function del(platform: string) {
    return DELETE(new Request('http://t/api/social/accounts', { method: 'DELETE', body: JSON.stringify({ platform }) }))
  }

  it('positive control: owner (has settings.integrations) can disconnect', async () => {
    const res = await del('facebook')
    expect(res.status).toBe(200)
    expect(spies.disconnectSocialAccount).toHaveBeenCalledWith(A, 'facebook')
  })

  it("permission probe: 'staff' (no settings.integrations) is denied 403, nothing disconnected", async () => {
    roleHolder.role = 'staff'
    const res = await del('facebook')
    expect(res.status).toBe(403)
    expect(spies.disconnectSocialAccount).not.toHaveBeenCalled()
  })

  it("permission probe: 'manager' (no settings.integrations) is denied 403", async () => {
    roleHolder.role = 'manager'
    const res = await del('facebook')
    expect(res.status).toBe(403)
    expect(spies.disconnectSocialAccount).not.toHaveBeenCalled()
  })
})
