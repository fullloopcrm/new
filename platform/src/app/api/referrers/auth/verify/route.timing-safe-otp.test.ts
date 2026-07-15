/**
 * POST /api/referrers/auth/verify — OTP hash compare.
 *
 * `referrer.otp_hash === hashOtp(code)` was a plain string compare, unlike
 * this file's own token verifier (referrer-portal-auth.ts's
 * verifyReferrerToken), which already uses crypto.timingSafeEqual. A timing
 * side-channel here lets an attacker recover the full stored HMAC-SHA256 hash
 * byte-by-byte from response latency, then brute-force the 900k-code space
 * offline in microseconds — completely bypassing the 8-attempts/15-min rate
 * limit. Fixed with the codebase's established safeEqual() helper.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const TENANT = { id: 'tenant-A', name: 'Test Co' }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => TENANT }))
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 7 })),
}))

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

import { supabaseAdmin } from '@/lib/supabase'
import { hashOtp } from '@/lib/referrer-portal-auth'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: unknown): NextRequest {
  return new NextRequest('http://x/api/referrers/auth/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('referrers', [
    {
      id: 'ref-1',
      tenant_id: TENANT.id,
      email: 'partner@example.com',
      referral_code: 'ABC123',
      status: 'active',
      otp_hash: hashOtp('654321'),
      otp_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    },
  ])
})

describe('POST /api/referrers/auth/verify — OTP hash compare', () => {
  it('issues a session token for the correct code', async () => {
    const res = await POST(req({ email: 'partner@example.com', code: '654321' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBeTruthy()
    expect(body.referral_code).toBe('ABC123')
  })

  it('rejects a wrong code of the same length', async () => {
    const res = await POST(req({ email: 'partner@example.com', code: '654322' }))
    expect(res.status).toBe(401)
  })

  it('rejects an expired code', async () => {
    fake._store.clear()
    fake._seed('referrers', [
      {
        id: 'ref-1',
        tenant_id: TENANT.id,
        email: 'partner@example.com',
        referral_code: 'ABC123',
        status: 'active',
        otp_hash: hashOtp('654321'),
        otp_expires_at: new Date(Date.now() - 1000).toISOString(),
      },
    ])
    const res = await POST(req({ email: 'partner@example.com', code: '654321' }))
    expect(res.status).toBe(401)
  })

  it('WITNESS: the OTP hash compare uses safeEqual, not a raw ===', () => {
    const src = readFileSync(join(__dirname, 'route.ts'), 'utf8')
    expect(src).toMatch(/safeEqual\(hashOtp\(code\), referrer\.otp_hash\)/)
    expect(src).not.toMatch(/referrer\.otp_hash === hashOtp\(code\)/)
  })
})
