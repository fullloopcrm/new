import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/social/connect/instagram — mints the Instagram OAuth authorize URL
 * (Instagram connect rides the Facebook Graph OAuth dialog). Same CWE-352
 * close as facebook/route.test.ts: the authorize URL previously had no
 * `state` param at all. Also proves the route now requires
 * settings.integrations — connecting an account is the mutating counterpart
 * to DELETE (disconnect), which already required that permission; connect
 * was the gap.
 */

let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: 'tenant-A' }, error: null }
  ),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { NextResponse } from 'next/server'
import { GET } from './route'
import { verifyOAuthState } from '@/lib/oauth-state'

beforeEach(() => {
  process.env.ADMIN_TOKEN_SECRET = 'test-secret'
  process.env.FACEBOOK_APP_ID = 'fb-app-id'
  delete process.env.NEXT_PUBLIC_APP_URL
  permissionError = null
})

describe('GET /api/social/connect/instagram', () => {
  it('returns 500 when FACEBOOK_APP_ID is not configured', async () => {
    delete process.env.FACEBOOK_APP_ID
    const res = await GET()
    expect(res.status).toBe(500)
  })

  it('a role lacking settings.integrations is forbidden and never mints an authorize URL', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await GET()
    expect(res.status).toBe(403)
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
