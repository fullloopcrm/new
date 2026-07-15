import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest'
import { signImpersonation, verifyImpersonationCookie } from './impersonation'

describe('impersonation signing', () => {
  beforeAll(() => {
    process.env.ADMIN_TOKEN_SECRET = 'test-secret-for-unit-tests'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('round-trips a valid tenant id', () => {
    const tenantId = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
    const signed = signImpersonation(tenantId)
    expect(signed.startsWith(tenantId + ':')).toBe(true)
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

  it('rejects a validly-signed cookie whose embedded exp has passed (replay of a captured cookie)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const tenantId = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
    const signed = signImpersonation(tenantId)
    expect(verifyImpersonationCookie(signed)).toBe(tenantId) // valid within the window

    vi.setSystemTime(new Date('2026-01-01T02:00:00Z')) // +2h, past the 1h window
    expect(verifyImpersonationCookie(signed)).toBeNull()
  })

  it('rejects a legitimately-signed cookie in the old pre-fix format (tenantId only, no embedded exp)', async () => {
    // Reconstructs exactly what the pre-fix signImpersonation() produced —
    // a valid HMAC over the bare tenantId with no exp in the payload — to
    // prove any cookie minted before this fix (or by a caller who forges the
    // old shape) is rejected outright, not just time-limited.
    const crypto = await import('node:crypto')
    const tenantId = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
    const hmac = crypto.createHmac('sha256', process.env.ADMIN_TOKEN_SECRET!).update(tenantId).digest('hex')
    const oldFormatCookie = `${tenantId}.${hmac}`
    expect(verifyImpersonationCookie(oldFormatCookie)).toBeNull()
  })
})
