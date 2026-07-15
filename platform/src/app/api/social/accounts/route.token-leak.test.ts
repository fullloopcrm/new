import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/social/accounts used to return the raw OAuth access_token
 * straight from the DB row -- any authenticated tenant member (including
 * read-only roles) could read the live Facebook/Instagram access_token via
 * the dashboard accounts list and use it to post to the connected page
 * outside the app. Fixed by stripping access_token from the response,
 * returning only the metadata the dashboard needs.
 * Ported from sibling-branch commit d6045727.
 */

const TENANT_A = 'tenant-a'
const SECRET_TOKEN = 'EAAG-super-secret-live-fb-token'

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenant: { id: TENANT_A } }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/social', () => ({
  getSocialAccounts: async () => [
    {
      id: 'acct-1',
      tenant_id: TENANT_A,
      platform: 'facebook',
      account_id: 'fb-123',
      account_name: 'My Page',
      access_token: SECRET_TOKEN,
      token_expires_at: '2027-01-01',
      page_id: 'page-123',
      connected_at: '2026-01-01',
    },
  ],
  disconnectSocialAccount: async () => {},
}))

import { GET } from './route'

describe('GET /api/social/accounts — OAuth token leak', () => {
  it('never includes the raw access_token in the response', async () => {
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.accounts).toHaveLength(1)
    expect(body.accounts[0].access_token).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain(SECRET_TOKEN)
  })

  it('still returns the metadata the dashboard needs', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.accounts[0]).toMatchObject({
      id: 'acct-1',
      platform: 'facebook',
      account_name: 'My Page',
      page_id: 'page-123',
    })
  })
})
