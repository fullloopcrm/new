import { describe, it, expect, beforeEach } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'

/**
 * (183): the admin-impersonation bypass allowlist (the `p.startsWith(...)`
 * chain below `if (!isPublicRoute(req))`) carried a `p.startsWith('/api/selena')`
 * entry that was fully dead code — isPublicRoute's own unbounded
 * '/api/selena(.*)' pattern already matches every path under that prefix
 * unconditionally, so `!isPublicRoute(req)` is always false for it and the
 * bypass allowlist below is never even reached, with or without that entry.
 * Inverse shape of (181)'s bug: there, an entry was MISSING and should have
 * been reachable; here, an entry was PRESENT and could never be reached at
 * all. Pins that /api/selena stays fully public (falls through with no
 * gate) identically whether or not a valid admin_token cookie is present —
 * proving the removed entry never changed live behavior.
 */

const SECRET = 'mw-selena-dead-bypass-test-secret'
const MAIN_HOST = 'homeservicesbusinesscrm.com'

function signToken(payload: Record<string, unknown>, secret = SECRET): string {
  const json = JSON.stringify(payload)
  const hmac = createHmac('sha256', secret).update(json).digest('hex')
  return Buffer.from(json).toString('base64') + '.' + hmac
}

function req(path: string, cookie?: string): NextRequest {
  return new NextRequest(`https://${MAIN_HOST}${path}`, {
    headers: cookie ? { host: MAIN_HOST, cookie } : { host: MAIN_HOST },
  })
}

beforeEach(() => {
  process.env.ADMIN_TOKEN_SECRET = SECRET
})

describe('middleware — dead /api/selena admin-bypass entry removal (183)', () => {
  it('/api/selena is public with no admin_token at all', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(req('/api/selena'))
    expect(res).toBeUndefined()
  })

  it('/api/selena/some-nested-path is public with no admin_token at all', async () => {
    const { default: middleware } = await import('./middleware')
    const res = await middleware(req('/api/selena/chat'))
    expect(res).toBeUndefined()
  })

  it('/api/selena is unaffected by a valid admin_token — still falls through identically', async () => {
    const { default: middleware } = await import('./middleware')
    const token = signToken({ role: 'super_admin', exp: Date.now() + 60_000 })
    const res = await middleware(req('/api/selena', `admin_token=${token}`))
    expect(res).toBeUndefined()
  })
})
