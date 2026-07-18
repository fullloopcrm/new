/**
 * POST /api/referrers -- auto-generated referral_code collision must retry,
 * not 500.
 *
 * referrers_code_unique constrains (tenant_id, referral_code)
 * (019_referral_commissions.sql), but generateRefCode() only draws from a
 * 4-letter name-prefix + ~900 possible 3-digit suffixes (100-999) -- far
 * fewer combinations than a random UUID, and two referrers sharing a common
 * first-name prefix collide with real, non-negligible probability on a
 * public, unauthenticated signup form. Pre-fix, a collision threw the raw
 * 23505 as an unhandled 500 straight to a real referrer signing up, instead
 * of regenerating and retrying -- the same class already fixed for
 * clients.pin/team_members.pin (see client-auth.ts's
 * randomClientPin()/MAX_CLIENT_PIN_ATTEMPTS).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createFakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({
  fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null,
}))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1' })),
}))
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 99 })),
}))

import { POST } from './route'

function signupReq(name: string, email: string): NextRequest {
  return new NextRequest('http://x/api/referrers', {
    method: 'POST',
    headers: { 'x-forwarded-for': '3.3.3.3', 'content-type': 'application/json' },
    body: JSON.stringify({ name, email }),
  })
}

beforeEach(() => {
  h.fake = createFakeSupabase({
    referrers: [
      {
        id: 'existing-1',
        tenant_id: 'tenant-1',
        name: 'John Existing',
        email: 'existing@example.com',
        referral_code: 'JOHN100',
        status: 'active',
      },
    ],
  })
  h.fake!._addUniqueConstraint('referrers', 'referral_code')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('POST /api/referrers -- referral_code collision retries instead of 500ing', () => {
  it('regenerates a fresh code and succeeds when the first draw collides', async () => {
    // generateRefCode: prefix = "JOHN" (first 4 alpha chars, uppercased),
    // suffix = floor(100 + Math.random()*900). First draw -> 0 -> 100
    // (collides with the seeded row). Second draw -> 0.5 -> 550 (free).
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5)

    const res = await POST(signupReq('John Newcomer', 'new@example.com'))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.referral.referral_code).toBe('JOHN550')
    expect(json.referral.referral_code).not.toBe('JOHN100')
    // Direct evidence the retry loop actually ran a second insert attempt,
    // not just that a plausible-looking code came back.
    expect(randomSpy).toHaveBeenCalledTimes(2)
  })

  it('gives up with a 409 (not a raw 500) if every attempt collides', async () => {
    // Force every draw in the retry budget to land on the same taken suffix.
    vi.spyOn(Math, 'random').mockReturnValue(0) // always suffix 100 -> "JOHN100"

    const res = await POST(signupReq('John Newcomer', 'new2@example.com'))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/unique referral code/i)
  })

  it('the non-colliding path (positive control) still succeeds on the first attempt', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5) // "JOHN550", free from the start

    const res = await POST(signupReq('John Newcomer', 'new3@example.com'))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.referral.referral_code).toBe('JOHN550')
    expect(randomSpy).toHaveBeenCalledTimes(1)
  })
})
