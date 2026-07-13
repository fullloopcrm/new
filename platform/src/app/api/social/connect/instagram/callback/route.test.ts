import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/social/connect/instagram/callback — zero prior coverage. Same
 * CWE-352 close as facebook/callback: proves a forged/missing/expired state
 * is rejected before saveSocialAccount runs, and that a valid state binds the
 * connected IG account to the tenant encoded in the state.
 */

const h = vi.hoisted(() => ({
  saveSocialAccount: vi.fn(),
}))

vi.mock('@/lib/social', () => ({
  saveSocialAccount: (...a: unknown[]) => h.saveSocialAccount(...a),
}))

import { GET } from './route'
import { signOAuthState } from '@/lib/oauth-state'

const cbReq = (params: Record<string, string>) =>
  new Request(`http://x/api/social/connect/instagram/callback?${new URLSearchParams(params)}`)

const igFetchOk = () =>
  vi.fn(async (url: string) => {
    if (url.includes('fb_exchange_token')) {
      return { ok: true, json: async () => ({ access_token: 'long-lived-token', expires_in: 5184000 }) }
    }
    if (url.includes('oauth/access_token')) {
      return { ok: true, json: async () => ({ access_token: 'short-lived-token' }) }
    }
    if (url.includes('/me/accounts')) {
      return { ok: true, json: async () => ({ data: [{ id: 'page-1', name: 'My Page', access_token: 'page-token' }] }) }
    }
    if (url.includes('instagram_business_account')) {
      return { ok: true, json: async () => ({ instagram_business_account: { id: 'ig-1' } }) }
    }
    if (url.includes('fields=username')) {
      return { ok: true, json: async () => ({ username: 'my_ig_handle' }) }
    }
    return { ok: true, json: async () => ({}) }
  })

beforeEach(() => {
  process.env.ADMIN_TOKEN_SECRET = 'test-secret'
  process.env.FACEBOOK_APP_ID = 'fb-app-id'
  process.env.FACEBOOK_APP_SECRET = 'fb-app-secret'
  delete process.env.NEXT_PUBLIC_APP_URL
  h.saveSocialAccount.mockReset()
  vi.stubGlobal('fetch', igFetchOk())
})

describe('GET /api/social/connect/instagram/callback — CSRF (signed state) gates', () => {
  it('rejects a request with no state param and never saves any account', async () => {
    const res = await GET(cbReq({ code: 'auth-code' }))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=bad_state')
    expect(h.saveSocialAccount).not.toHaveBeenCalled()
  })

  it('rejects a forged state (signed with the wrong secret) and never saves any account', async () => {
    const crypto = await import('crypto')
    const payload = `attacker-tenant.${Date.now() + 60000}`
    const forgedSig = crypto.createHmac('sha256', 'not-the-real-secret').update(payload).digest('hex')

    const res = await GET(cbReq({ code: 'auth-code', state: `${payload}.${forgedSig}` }))

    expect(res.headers.get('location')).toContain('error=bad_state')
    expect(h.saveSocialAccount).not.toHaveBeenCalled()
  })

  it('rejects an expired state and never saves any account', async () => {
    vi.useFakeTimers()
    try {
      const state = signOAuthState('tenant-A')
      vi.advanceTimersByTime(16 * 60 * 1000)

      const res = await GET(cbReq({ code: 'auth-code', state }))

      expect(res.headers.get('location')).toContain('error=bad_state')
      expect(h.saveSocialAccount).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('GET /api/social/connect/instagram/callback — success path', () => {
  it('binds the connected IG account to the tenant encoded in the signed state', async () => {
    const state = signOAuthState('tenant-from-state')

    const res = await GET(cbReq({ code: 'auth-code', state }))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('connected=instagram')
    expect(h.saveSocialAccount).toHaveBeenCalledTimes(1)
    expect(h.saveSocialAccount).toHaveBeenCalledWith(
      'tenant-from-state',
      'instagram',
      expect.objectContaining({ account_id: 'ig-1', account_name: 'my_ig_handle' }),
    )
  })

  it('redirects with no_ig_account and never saves when the page has no linked Instagram business account', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('fb_exchange_token')) return { ok: true, json: async () => ({ access_token: 'llt' }) }
      if (url.includes('oauth/access_token')) return { ok: true, json: async () => ({ access_token: 'slt' }) }
      if (url.includes('/me/accounts')) return { ok: true, json: async () => ({ data: [{ id: 'page-1', name: 'My Page', access_token: 'pt' }] }) }
      if (url.includes('instagram_business_account')) return { ok: true, json: async () => ({}) }
      return { ok: true, json: async () => ({}) }
    }))
    const state = signOAuthState('tenant-A')

    const res = await GET(cbReq({ code: 'auth-code', state }))

    expect(res.headers.get('location')).toContain('error=no_ig_account')
    expect(h.saveSocialAccount).not.toHaveBeenCalled()
  })

  it('falls back to the default base URL when NEXT_PUBLIC_APP_URL is unset (no literal "undefined" in the redirect)', async () => {
    const state = signOAuthState('tenant-A')
    const res = await GET(cbReq({ code: 'auth-code', state }))

    const location = res.headers.get('location')!
    expect(location).not.toContain('undefined')
    expect(location.startsWith('https://homeservicesbusinesscrm.com/dashboard/social')).toBe(true)
  })
})
