import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/social/connect/instagram — mints the Instagram OAuth authorize URL
 * (Instagram connect rides the Facebook Graph OAuth dialog). Zero prior
 * coverage. Same CWE-352 close as facebook/route.test.ts: the authorize URL
 * previously had no `state` param at all.
 */

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: 'tenant-A', role: 'owner', tenant: { id: 'tenant-A' } }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { GET } from './route'
import { AuthError } from '@/lib/tenant-query'
import { verifyOAuthState } from '@/lib/oauth-state'

beforeEach(() => {
  process.env.ADMIN_TOKEN_SECRET = 'test-secret'
  process.env.FACEBOOK_APP_ID = 'fb-app-id'
  delete process.env.NEXT_PUBLIC_APP_URL
})

describe('GET /api/social/connect/instagram', () => {
  it('returns 500 when FACEBOOK_APP_ID is not configured', async () => {
    delete process.env.FACEBOOK_APP_ID
    const res = await GET()
    expect(res.status).toBe(500)
  })

  it('propagates an AuthError from getTenantForRequest unchanged', async () => {
    const tenantQuery = await import('@/lib/tenant-query')
    vi.spyOn(tenantQuery, 'getTenantForRequest').mockRejectedValueOnce(new AuthError('Unauthorized', 401))

    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('includes a state param that verifies back to the requesting tenant (CSRF close)', async () => {
    const res = await GET()
    const { url } = await res.json()
    const state = new URL(url).searchParams.get('state')

    expect(state).toBeTruthy()
    expect(verifyOAuthState(state)).toBe('tenant-A')
  })

  it('falls back to the default base URL when NEXT_PUBLIC_APP_URL is unset (no literal "undefined" in the redirect_uri)', async () => {
    const res = await GET()
    const { url } = await res.json()
    const redirectUri = new URL(url).searchParams.get('redirect_uri')

    expect(redirectUri).not.toContain('undefined')
    expect(redirectUri).toBe('https://homeservicesbusinesscrm.com/api/social/connect/instagram/callback')
  })

  it('includes the instagram-specific scopes in addition to the page scopes', async () => {
    const res = await GET()
    const { url } = await res.json()
    const scope = new URL(url).searchParams.get('scope')

    expect(scope).toContain('instagram_basic')
    expect(scope).toContain('instagram_content_publish')
  })
})
