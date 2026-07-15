import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/social/connect/facebook/callback — zero prior coverage. This is the
 * security-critical half of the CWE-352 fix: proving a forged/missing/expired
 * `state` is actually rejected (never reaching saveSocialAccount), and that a
 * valid state binds the connected account to the TENANT ENCODED IN THE STATE,
 * not to whatever tenant happens to be in the current session — closing the
 * exact class oauth-state.ts was built for.
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
  new Request(`http://x/api/social/connect/facebook/callback?${new URLSearchParams(params)}`)

const fbFetchOk = () =>
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
    return { ok: true, json: async () => ({}) }
  })

beforeEach(() => {
  process.env.ADMIN_TOKEN_SECRET = 'test-secret'
  process.env.FACEBOOK_APP_ID = 'fb-app-id'
  process.env.FACEBOOK_APP_SECRET = 'fb-app-secret'
  delete process.env.NEXT_PUBLIC_APP_URL
  h.saveSocialAccount.mockReset()
  vi.stubGlobal('fetch', fbFetchOk())
})

describe('GET /api/social/connect/facebook/callback — CSRF (signed state) gates', () => {
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

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=bad_state')
    expect(h.saveSocialAccount).not.toHaveBeenCalled()
  })

  it('rejects a state signed for one tenant but tampered to claim another', async () => {
    const real = signOAuthState('tenant-real')
    const [, exp, sig] = real.split('.')
    const tampered = `tenant-spoofed.${exp}.${sig}`

    const res = await GET(cbReq({ code: 'auth-code', state: tampered }))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=bad_state')
    expect(h.saveSocialAccount).not.toHaveBeenCalled()
  })

  it('rejects an expired state and never saves any account', async () => {
    vi.useFakeTimers()
    try {
      const state = signOAuthState('tenant-A')
      vi.advanceTimersByTime(16 * 60 * 1000)

      const res = await GET(cbReq({ code: 'auth-code', state }))

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('error=bad_state')
      expect(h.saveSocialAccount).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects a missing code before even looking at state', async () => {
    const state = signOAuthState('tenant-A')
    const res = await GET(cbReq({ state }))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=no_code')
    expect(h.saveSocialAccount).not.toHaveBeenCalled()
  })
})

describe('GET /api/social/connect/facebook/callback — success path', () => {
  it('binds the connected page to the tenant encoded in the signed state', async () => {
    const state = signOAuthState('tenant-from-state')

    const res = await GET(cbReq({ code: 'auth-code', state }))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('connected=facebook')
    expect(h.saveSocialAccount).toHaveBeenCalledTimes(1)
    expect(h.saveSocialAccount).toHaveBeenCalledWith(
      'tenant-from-state',
      'facebook',
      expect.objectContaining({ account_id: 'page-1', account_name: 'My Page' }),
    )
  })

  it('never binds to a tenant other than the one in the state, even if a different tenant id were somehow suggested', async () => {
    const state = signOAuthState('tenant-real')
    await GET(cbReq({ code: 'auth-code', state, tenant: 'tenant-spoofed' }))

    expect(h.saveSocialAccount).toHaveBeenCalledWith('tenant-real', 'facebook', expect.anything())
  })

  it('redirects with token_failed and never saves when the token exchange fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    const state = signOAuthState('tenant-A')

    const res = await GET(cbReq({ code: 'auth-code', state }))

    expect(res.headers.get('location')).toContain('error=token_failed')
    expect(h.saveSocialAccount).not.toHaveBeenCalled()
  })

  it('redirects with no_pages and never saves when the account has no Facebook pages', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('fb_exchange_token')) return { ok: true, json: async () => ({ access_token: 'llt' }) }
      if (url.includes('oauth/access_token')) return { ok: true, json: async () => ({ access_token: 'slt' }) }
      if (url.includes('/me/accounts')) return { ok: true, json: async () => ({ data: [] }) }
      return { ok: true, json: async () => ({}) }
    }))
    const state = signOAuthState('tenant-A')

    const res = await GET(cbReq({ code: 'auth-code', state }))

    expect(res.headers.get('location')).toContain('error=no_pages')
    expect(h.saveSocialAccount).not.toHaveBeenCalled()
  })

  it('falls back to the default base URL when NEXT_PUBLIC_APP_URL is unset (no literal "undefined" in the redirect)', async () => {
    const state = signOAuthState('tenant-A')
    const res = await GET(cbReq({ code: 'auth-code', state }))

    const location = res.headers.get('location')!
    expect(location).not.toContain('undefined')
    expect(location.startsWith('https://homeservicesbusinesscrm.com/dashboard/social')).toBe(true)
  })

  it('redirects with error=unknown (not a raw 500/stack trace) when an unexpected exception occurs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const state = signOAuthState('tenant-A')

    const res = await GET(cbReq({ code: 'auth-code', state }))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=unknown')
  })
})
