import { describe, it, expect, beforeAll } from 'vitest'
import crypto from 'node:crypto'
import { signImpersonation, verifyImpersonationCookie } from './impersonation'

describe('impersonation signing', () => {
  beforeAll(() => {
    process.env.ADMIN_TOKEN_SECRET = 'test-secret-for-unit-tests'
  })

  it('round-trips a valid tenant id', () => {
    const tenantId = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
    const signed = signImpersonation(tenantId)
    expect(signed.startsWith(tenantId + '.')).toBe(true)
    expect(verifyImpersonationCookie(signed)).toBe(tenantId)
  })

  it('rejects a tampered tenant id', () => {
    const tenantId = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
    const signed = signImpersonation(tenantId)
    const tampered = signed.replace(tenantId, '00000000-0000-0000-0000-000000000000')
    expect(verifyImpersonationCookie(tampered)).toBeNull()
  })

  it('rejects a truncated signature', () => {
    const signed = signImpersonation('abc')
    expect(verifyImpersonationCookie(signed.slice(0, -2))).toBeNull()
  })

  it('rejects empty cookie', () => {
    expect(verifyImpersonationCookie(undefined)).toBeNull()
    expect(verifyImpersonationCookie('')).toBeNull()
  })

  it('rejects legacy unsigned cookie by default', () => {
    // Raw uuid with no dot — old format.
    expect(verifyImpersonationCookie('24d94cd6-9fc0-4882-b544-fa25a4542e9e')).toBeNull()
  })

  it('accepts legacy unsigned cookie when IMPERSONATION_ALLOW_UNSIGNED=1', () => {
    process.env.IMPERSONATION_ALLOW_UNSIGNED = '1'
    expect(verifyImpersonationCookie('24d94cd6-9fc0-4882-b544-fa25a4542e9e')).toBe('24d94cd6-9fc0-4882-b544-fa25a4542e9e')
    delete process.env.IMPERSONATION_ALLOW_UNSIGNED
  })

  it('rejects an expired signed cookie even with a valid signature', () => {
    const tenantId = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
    const secret = process.env.ADMIN_TOKEN_SECRET!
    const exp = Date.now() - 1000 // already expired
    const payload = `${tenantId}.${exp}`
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    const expiredCookie = `${payload}.${hmac}`
    expect(verifyImpersonationCookie(expiredCookie)).toBeNull()
  })

  it('rejects a tampered exp (extending the deadline) even with a stale-looking signature', () => {
    const tenantId = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
    const signed = signImpersonation(tenantId)
    const [, exp, sig] = signed.split('.')
    const tampered = `${tenantId}.${Number(exp) + 1000000}.${sig}`
    expect(verifyImpersonationCookie(tampered)).toBeNull()
  })

  it('rejects a pre-expiry legacy signed cookie (no exp segment)', () => {
    const tenantId = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
    const secret = process.env.ADMIN_TOKEN_SECRET!
    const hmac = crypto.createHmac('sha256', secret).update(tenantId).digest('hex')
    const legacySigned = `${tenantId}.${hmac}`
    expect(verifyImpersonationCookie(legacySigned)).toBeNull()
  })
})
