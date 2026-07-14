import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

/**
 * GET /api/social/connect/facebook/callback — binds a connected FB page to
 * whichever tenant is named in the signed `state` param (CSRF, CWE-352).
 * Before this fix the tenant came from the CALLER's live session instead:
 * an attacker could start their own FB OAuth flow, capture the `code`, then
 * trick a logged-in victim admin into hitting this callback URL with it —
 * silently binding the attacker's FB page to the victim's tenant. Proves the
 * callback now trusts only the signed state, not the request session, and
 * rejects missing/forged/tampered state before ever calling saveSocialAccount.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const spies = vi.hoisted(() => ({ saveSocialAccount: vi.fn(async () => undefined) }))
vi.mock('@/lib/social', () => ({ saveSocialAccount: spies.saveSocialAccount }))

import { GET } from './route'
import { signOAuthState } from '@/lib/oauth-state'

beforeAll(() => {
  process.env.ADMIN_TOKEN_SECRET = 'test-secret'
  process.env.FACEBOOK_APP_ID = 'fb-app-id'
  process.env.FACEBOOK_APP_SECRET = 'fb-app-secret'
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
})

beforeEach(() => {
  spies.saveSocialAccount.mockClear()
  global.fetch = vi.fn(async (url: string) => {
    if (url.includes('/oauth/access_token?grant_type=fb_exchange_token')) {
      return { json: async () => ({ access_token: 'long-lived-token', expires_in: 5184000 }) } as Response
    }
    if (url.includes('/oauth/access_token')) {
      return { json: async () => ({ access_token: 'short-lived-token' }) } as Response
    }
    if (url.includes('/me/accounts')) {
      return { json: async () => ({ data: [{ id: 'page-1', name: 'My Page', access_token: 'page-token' }] }) } as Response
    }
    throw new Error(`unexpected fetch: ${url}`)
  }) as unknown as typeof fetch
})

function req(params: Record<string, string>) {
  const url = new URL('https://app.example.com/api/social/connect/facebook/callback')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString())
}

describe('social/connect/facebook/callback — CSRF state gate', () => {
  it('rejects a request with no state param, never saves an account', async () => {
    const res = await GET(req({ code: 'auth-code' }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=bad_state')
    expect(spies.saveSocialAccount).not.toHaveBeenCalled()
  })

  it('rejects a forged/garbage state, never saves an account', async () => {
    const res = await GET(req({ code: 'auth-code', state: 'not-a-real-signed-state' }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=bad_state')
    expect(spies.saveSocialAccount).not.toHaveBeenCalled()
  })

  it('rejects a state signed for one tenant but tampered to claim another', async () => {
    const real = signOAuthState(TENANT_A)
    const [, exp, sig] = real.split('.')
    const tampered = `${TENANT_B}.${exp}.${sig}`
    const res = await GET(req({ code: 'auth-code', state: tampered }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=bad_state')
    expect(spies.saveSocialAccount).not.toHaveBeenCalled()
  })

  it('positive control: a validly signed state binds the page to that exact tenant', async () => {
    const state = signOAuthState(TENANT_A)
    const res = await GET(req({ code: 'auth-code', state }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('connected=facebook')
    expect(spies.saveSocialAccount).toHaveBeenCalledTimes(1)
    expect(spies.saveSocialAccount).toHaveBeenCalledWith(
      TENANT_A,
      'facebook',
      expect.objectContaining({ account_id: 'page-1' })
    )
  })
})
