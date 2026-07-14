import { describe, it, expect, vi, beforeAll } from 'vitest'

/**
 * GET /api/social/connect/instagram (authorize) — same CSRF-state contract as
 * the Facebook authorize route (shared Meta OAuth flow); see facebook/route.test.ts.
 */

const TENANT_ID = 'tid-a'

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenant: { id: TENANT_ID } })),
  AuthError: class AuthError extends Error {
    status = 401
  },
}))

import { GET } from './route'
import { verifyOAuthState } from '@/lib/oauth-state'

beforeAll(() => {
  process.env.ADMIN_TOKEN_SECRET = 'test-secret'
  process.env.FACEBOOK_APP_ID = 'fb-app-id'
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
})

describe('social/connect/instagram — authorize', () => {
  it('mints a signed state bound to the caller\'s own tenant', async () => {
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
    expect(redirectUri).toBe('https://app.example.com/api/social/connect/instagram/callback')
  })
})
