import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

/**
 * GET /api/google/auth (authorize) — mints a signed state and redirects into
 * Google's OAuth consent screen; the callback binds the connected Business
 * Profile to whichever tenant the state names (no session at that point).
 * Proves the authorize step is gated the same as its social/connect siblings
 * (P95) instead of being reachable by any authenticated tenant member.
 */

const TENANT_ID = 'tid-a'

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: {} as Record<string, unknown>,
}))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({
    userId: 'u1',
    tenantId: TENANT_ID,
    tenant: tenantHolder.tenant,
    role: tenantHolder.role,
  })),
  AuthError: class AuthError extends Error {
    status = 401
  },
}))

import { GET } from './route'
import { verifyOAuthState } from '@/lib/oauth-state'

beforeAll(() => {
  process.env.ADMIN_TOKEN_SECRET = 'test-secret'
  process.env.GOOGLE_CLIENT_ID = 'google-client-id'
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
})

beforeEach(() => {
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: TENANT_ID }
})

describe('google/auth — authorize', () => {
  it("mints a signed state bound to the caller's own tenant", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const url = new URL(body.url)
    const state = url.searchParams.get('state')
    expect(state).toBeTruthy()
    expect(verifyOAuthState(state)).toBe(TENANT_ID)
  })

  it('points redirect_uri at the callback route', async () => {
    const res = await GET()
    const body = await res.json()
    const url = new URL(body.url)
    const redirectUri = url.searchParams.get('redirect_uri')
    expect(redirectUri).toBe('https://app.example.com/api/google/callback')
  })
})

describe('google/auth — permission probe', () => {
  it('owner (has settings.integrations per rbac.ts) can start the OAuth flow', async () => {
    tenantHolder.role = 'owner'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'admin' (no settings.integrations by default — owner-only) is forbidden", async () => {
    tenantHolder.role = 'admin'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: 'staff' (no settings.integrations) is forbidden", async () => {
    tenantHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.url).toBeUndefined()
  })

  it('a tenant override granting settings.integrations to manager allows GET for manager', async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: TENANT_ID,
      selena_config: { role_permissions: { manager: { 'settings.integrations': true } } },
    }
    const res = await GET()
    expect(res.status).toBe(200)
  })
})
