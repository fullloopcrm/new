import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { verifyAdminTokenEdge } from './admin-token-edge-verify'

/**
 * This must accept exactly what the Node-side createAdminToken/verifyAdminToken
 * (src/app/api/admin-auth/route.ts) produce — it's a hand-rolled Edge-Runtime
 * substitute for the same check, so the first job is proving it round-trips
 * against the real Node signer, not just against itself.
 */

const SECRET = 'admin-token-edge-test-secret'

function signToken(payload: Record<string, unknown>, secret = SECRET): string {
  // Mirrors createAdminToken in admin-auth/route.ts byte-for-byte (Node crypto).
  const json = JSON.stringify(payload)
  const hmac = createHmac('sha256', secret).update(json).digest('hex')
  return Buffer.from(json).toString('base64') + '.' + hmac
}

describe('verifyAdminTokenEdge', () => {
  it('accepts a real super_admin token signed by the Node path', () => {
    const token = signToken({ role: 'super_admin', exp: Date.now() + 60_000 })
    expect(verifyAdminTokenEdge(token, SECRET)).toBe(true)
  })

  it('rejects an expired token', () => {
    const token = signToken({ role: 'super_admin', exp: Date.now() - 1000 })
    expect(verifyAdminTokenEdge(token, SECRET)).toBe(false)
  })

  it('rejects a tenant_admin-role token (only super_admin passes this gate)', () => {
    const token = signToken({ role: 'tenant_admin', tenantId: 't-1', memberId: 'm-1', exp: Date.now() + 60_000 })
    expect(verifyAdminTokenEdge(token, SECRET)).toBe(false)
  })

  it('rejects a tampered payload (exp extended after signing, sig unchanged)', () => {
    const token = signToken({ role: 'super_admin', exp: Date.now() + 60_000 })
    const sig = token.split('.')[1]
    const forgedPayload = Buffer.from(JSON.stringify({ role: 'super_admin', exp: Date.now() + 999_999_999 })).toString('base64')
    expect(verifyAdminTokenEdge(`${forgedPayload}.${sig}`, SECRET)).toBe(false)
  })

  it('rejects a tampered signature', () => {
    const token = signToken({ role: 'super_admin', exp: Date.now() + 60_000 })
    const tampered = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0')
    expect(verifyAdminTokenEdge(tampered, SECRET)).toBe(false)
  })

  it('rejects a token signed with the wrong secret', () => {
    const token = signToken({ role: 'super_admin', exp: Date.now() + 60_000 }, 'a-different-secret')
    expect(verifyAdminTokenEdge(token, SECRET)).toBe(false)
  })

  it('rejects garbage cookie values (no dot separator)', () => {
    expect(verifyAdminTokenEdge('not-a-real-token', SECRET)).toBe(false)
  })

  it.each([
    ['empty string', ''],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s token', (_label, token) => {
    expect(verifyAdminTokenEdge(token as string | null, SECRET)).toBe(false)
  })

  it('fails closed when the secret env var is unset', () => {
    const token = signToken({ role: 'super_admin', exp: Date.now() + 60_000 })
    expect(verifyAdminTokenEdge(token, undefined)).toBe(false)
  })
})
