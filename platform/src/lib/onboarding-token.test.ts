import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { signOnboardingToken, verifyOnboardingToken } from './onboarding-token'

describe('onboarding-token', () => {
  beforeEach(() => {
    process.env.ONBOARDING_TOKEN_SECRET = 'test-secret-do-not-use-in-prod'
  })
  afterEach(() => {
    delete process.env.ONBOARDING_TOKEN_SECRET
  })

  it('round-trips a valid token', () => {
    const token = signOnboardingToken('tenant-A', 1)
    const verified = verifyOnboardingToken(token)
    expect(verified).toEqual({ tenantId: 'tenant-A', linkVersion: 1 })
  })

  it('rejects a token signed under a different secret (tampered/forged)', () => {
    const token = signOnboardingToken('tenant-A', 1)
    process.env.ONBOARDING_TOKEN_SECRET = 'a-different-secret'
    expect(verifyOnboardingToken(token)).toBeNull()
  })

  it('rejects a token whose payload was tampered with (tenantId swapped)', () => {
    const token = signOnboardingToken('tenant-A', 1)
    const [, sig] = token.split('.')
    const forgedBody = Buffer.from(JSON.stringify({ t: 'tenant-B', v: 1, e: Math.floor(Date.now() / 1000) + 86400 })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(verifyOnboardingToken(`${forgedBody}.${sig}`)).toBeNull()
  })

  it('rejects an expired token', () => {
    const token = signOnboardingToken('tenant-A', 1, -1) // ttlDays negative -> already expired
    expect(verifyOnboardingToken(token)).toBeNull()
  })

  it('rejects malformed input', () => {
    expect(verifyOnboardingToken(null)).toBeNull()
    expect(verifyOnboardingToken(undefined)).toBeNull()
    expect(verifyOnboardingToken('')).toBeNull()
    expect(verifyOnboardingToken('not-a-real-token')).toBeNull()
    expect(verifyOnboardingToken('..')).toBeNull()
  })

  it('different tenants/versions produce different tokens (no collision)', () => {
    const a = signOnboardingToken('tenant-A', 1)
    const b = signOnboardingToken('tenant-B', 1)
    const c = signOnboardingToken('tenant-A', 2)
    expect(a).not.toBe(b)
    expect(a).not.toBe(c)
  })

  it('verify reports the linkVersion embedded at sign time, so a caller can compare against the tenant row', () => {
    const token = signOnboardingToken('tenant-A', 7)
    expect(verifyOnboardingToken(token)?.linkVersion).toBe(7)
  })
})
