import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Route-level tests for the onboarding PIN gate. Uses the REAL
 * onboarding-token sign/verify (only supabaseAdmin and the rate limiter are
 * mocked) so the actual signature/expiry/version checks are exercised, not
 * just the wiring around them.
 */

const h = vi.hoisted(() => ({ tenant: null as Record<string, unknown> | null }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: h.tenant, error: null }) }) }),
    }),
  },
}))

const rateLimitDbMock = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: (...args: unknown[]) => rateLimitDbMock(...args),
}))

import { GET, POST } from './route'
import { signOnboardingToken } from '@/lib/onboarding-token'

beforeEach(() => {
  process.env.ONBOARDING_TOKEN_SECRET = 'test-secret'
  rateLimitDbMock.mockReset()
  rateLimitDbMock.mockResolvedValue({ allowed: true, remaining: 7 })
  h.tenant = { name: 'Acme Cleaning', onboarding_link_version: 1, phone: '(212) 555-0199', owner_phone: null }
})

describe('GET /api/onboarding/pin', () => {
  it('401s on an invalid/missing token', async () => {
    const res = await GET(new Request('http://x/api/onboarding/pin?token=garbage'))
    expect(res.status).toBe(401)
  })

  it('returns the tenant name and pinRequired:true when a phone is on file', async () => {
    const token = signOnboardingToken('tenant-A', 1)
    const res = await GET(new Request(`http://x/api/onboarding/pin?token=${token}`))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toEqual({ name: 'Acme Cleaning', pinRequired: true })
  })

  it('returns pinRequired:false when the tenant has no phone on file', async () => {
    h.tenant = { name: 'Acme Cleaning', onboarding_link_version: 1, phone: null, owner_phone: null }
    const token = signOnboardingToken('tenant-A', 1)
    const res = await GET(new Request(`http://x/api/onboarding/pin?token=${token}`))
    expect((await res.json()).pinRequired).toBe(false)
  })
})

describe('POST /api/onboarding/pin', () => {
  it('401s on an invalid/missing token', async () => {
    const res = await POST(new Request('http://x/api/onboarding/pin', { method: 'POST', body: JSON.stringify({ token: 'garbage', pin: '0199' }) }))
    expect(res.status).toBe(401)
  })

  it('rejects an incorrect PIN and does not return a token', async () => {
    const token = signOnboardingToken('tenant-A', 1)
    const res = await POST(new Request('http://x/api/onboarding/pin', { method: 'POST', body: JSON.stringify({ token, pin: '0000' }) }))
    expect(res.status).toBe(401)
    expect((await res.json()).token).toBeUndefined()
  })

  it('accepts the correct PIN (last 4 digits of phone) and returns an elevated token', async () => {
    const token = signOnboardingToken('tenant-A', 1)
    const res = await POST(new Request('http://x/api/onboarding/pin', { method: 'POST', body: JSON.stringify({ token, pin: '0199' }) }))
    expect(res.status).toBe(200)
    const elevated = (await res.json()).token as string
    expect(typeof elevated).toBe('string')
    expect(elevated).not.toBe(token)
  })

  it('the elevated token round-trips as pin-verified for the same tenant/version', async () => {
    const token = signOnboardingToken('tenant-A', 1)
    const res = await POST(new Request('http://x/api/onboarding/pin', { method: 'POST', body: JSON.stringify({ token, pin: '0199' }) }))
    const elevated = (await res.json()).token as string

    const { verifyOnboardingToken } = await import('@/lib/onboarding-token')
    const verified = verifyOnboardingToken(elevated)
    expect(verified).toEqual({ tenantId: 'tenant-A', linkVersion: 1, pinVerified: true })
  })

  it('bypasses the rate limiter and elevates immediately when the tenant has no phone on file', async () => {
    h.tenant = { name: 'Acme Cleaning', onboarding_link_version: 1, phone: null, owner_phone: null }
    const token = signOnboardingToken('tenant-A', 1)
    const res = await POST(new Request('http://x/api/onboarding/pin', { method: 'POST', body: JSON.stringify({ token, pin: 'anything' }) }))
    expect(res.status).toBe(200)
    expect(rateLimitDbMock).not.toHaveBeenCalled()
  })

  it('429s once the rate limiter denies further attempts', async () => {
    rateLimitDbMock.mockResolvedValue({ allowed: false, remaining: 0 })
    const token = signOnboardingToken('tenant-A', 1)
    const res = await POST(new Request('http://x/api/onboarding/pin', { method: 'POST', body: JSON.stringify({ token, pin: '0199' }) }))
    expect(res.status).toBe(429)
  })

  it('rejects a non-4-digit PIN without matching by prefix', async () => {
    const token = signOnboardingToken('tenant-A', 1)
    const res = await POST(new Request('http://x/api/onboarding/pin', { method: 'POST', body: JSON.stringify({ token, pin: '01990' }) }))
    expect(res.status).toBe(401)
  })
})
