import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/social/connect/facebook — mints the Facebook OAuth authorize URL.
 * The bug this closes: the authorize URL previously had NO `state` param at
 * all (CWE-352 OAuth login CSRF — same class already fixed for Google, see
 * src/lib/oauth-state.ts). These tests prove the state param is actually
 * present and is a real signed-tenant token, not just that the route returns
 * 200. Also proves the route now requires settings.integrations — connecting
 * a page is the mutating counterpart to DELETE (disconnect), which already
 * required that permission; connect was the gap.
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

describe('GET /api/social/connect/facebook', () => {
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
    const parsed = new URL(url)
    const state = parsed.searchParams.get('state')

    expect(state).toBeTruthy()
    expect(verifyOAuthState(state)).toBe('tenant-A')
  })

  it('falls back to the default base URL when NEXT_PUBLIC_APP_URL is unset (no literal "undefined" in the redirect_uri)', async () => {
    const res = await GET()
    const { url } = await res.json()
    const redirectUri = new URL(url).searchParams.get('redirect_uri')

    expect(redirectUri).not.toContain('undefined')
    expect(redirectUri).toBe('https://homeservicesbusinesscrm.com/api/social/connect/facebook/callback')
  })

  it('uses NEXT_PUBLIC_APP_URL when set', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://custom.example.com'
    const res = await GET()
    const { url } = await res.json()
    const redirectUri = new URL(url).searchParams.get('redirect_uri')

    expect(redirectUri).toBe('https://custom.example.com/api/social/connect/facebook/callback')
  })

  it('targets the Facebook OAuth dialog with the expected scopes', async () => {
    const res = await GET()
    const { url } = await res.json()
    const parsed = new URL(url)

    expect(parsed.origin + parsed.pathname).toBe('https://www.facebook.com/v19.0/dialog/oauth')
    expect(parsed.searchParams.get('scope')).toBe('pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata')
    expect(parsed.searchParams.get('response_type')).toBe('code')
  })
})
