import { describe, it, expect, vi } from 'vitest'

/**
 * referrers/auth/request and referrers/auth/verify both look up the
 * referrer by `.ilike('email', email)` with the caller-supplied `email`
 * used raw, unescaped. Both routes' brute-force/spam throttles are keyed
 * on the submitted `email` string (`referrer_otp_req:${email}`,
 * `referrer_otp_verify:${email}`) on the assumption that string uniquely
 * identifies the target referrer row. An unescaped '%'/'_' breaks that
 * assumption: an attacker can rotate the submitted email (e.g. varying
 * wildcard characters) to mint a fresh rate-limit bucket on every request
 * while the ILIKE pattern still resolves to the SAME target row, defeating
 * the per-email OTP throttle. Mirrors the escapeLike() fix already applied
 * in ../../route.ts and lib/inbound-email-tenant.ts.
 *
 * These suites mock `.ilike()` with real SQL-LIKE pattern semantics (the
 * bruteforce/otp-rng suites mock it as a no-op passthrough, so they can't
 * catch this).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const VICTIM_EMAIL = 'victim@example.com'

type Row = Record<string, unknown>

function likeToRegExp(pattern: string): RegExp {
  let out = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\' && i + 1 < pattern.length) {
      out += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    } else if (c === '%') {
      out += '.*'
    } else if (c === '_') {
      out += '.'
    } else {
      out += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${out}$`, 'i')
}

function chain(table: string) {
  const rows: Row[] =
    table === 'referrers'
      ? [{
          id: 'ref-victim', tenant_id: TENANT, name: 'Victim', email: VICTIM_EMAIL, referral_code: 'VICT123',
          // A live, unexpired OTP already issued to the victim — as if the
          // attacker observed/guessed the correct 6-digit code but not the
          // victim's exact email string.
          otp_hash: 'hash:123456', otp_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), status: 'active',
        }]
      : [{ id: TENANT, name: 'Canary', primary_color: '#000', resend_api_key: null, resend_domain: null }]
  let filtered = [...rows]
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filtered = filtered.filter((r) => r[col] === val); return c },
    ilike: (col: string, pattern: string) => {
      const re = likeToRegExp(pattern)
      filtered = filtered.filter((r) => re.test(String(r[col] ?? '')))
      return c
    },
    update: () => c,
    single: async () => (filtered.length > 0 ? { data: filtered[0], error: null } : { data: null, error: { message: 'not found' } }),
    maybeSingle: async () => (filtered.length === 1 ? { data: filtered[0], error: null } : { data: null, error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => ({ id: TENANT, name: 'Canary', slug: 'canary' }) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/referrer-portal-auth', () => ({
  hashOtp: (code: string) => `hash:${code}`,
  createReferrerToken: () => 'token',
}))
vi.mock('@/lib/rate-limit-db', () => ({
  // Neutral pass-through — this suite is only about ILIKE row-matching, not throttling.
  rateLimitDb: async () => ({ allowed: true, remaining: 99 }),
}))

import { POST as requestOtp } from '@/app/api/referrers/auth/request/route'
import { POST as verifyOtp } from '@/app/api/referrers/auth/verify/route'

function jsonReq(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof requestOtp>[0]
}

describe('referrers/auth/request — ILIKE wildcard is neutralized', () => {
  it('a bare "%" wildcard email does NOT resolve to the victim referrer row', async () => {
    const { sendEmail } = await import('@/lib/email')
    const res = await requestOtp(jsonReq('https://canary.example.com/api/referrers/auth/request', { email: '%' }))
    expect(res.status).toBe(200) // always {ok:true} by design, no enumeration oracle
    expect(sendEmail).not.toHaveBeenCalled() // but the wildcard must not match anyone
  })

  it('still resolves the real address exactly (case-insensitive)', async () => {
    const { sendEmail } = await import('@/lib/email')
    vi.mocked(sendEmail).mockClear()
    await requestOtp(jsonReq('https://canary.example.com/api/referrers/auth/request', { email: VICTIM_EMAIL.toUpperCase() }))
    expect(sendEmail).toHaveBeenCalled()
  })
})

describe('referrers/auth/verify — ILIKE wildcard is neutralized', () => {
  it('a wildcard prefix must NOT authenticate as the victim even with their correct code', async () => {
    // Attacker knows the code (leaked/guessed) but only a prefix of the
    // victim's email — unescaped ILIKE would let 'v%' match victim@example.com.
    const res = await verifyOtp(jsonReq('https://canary.example.com/api/referrers/auth/verify', { email: 'v%', code: '123456' }))
    expect(res.status).toBe(401)
  })

  it('the exact address (case-insensitive) with the correct code still authenticates', async () => {
    const res = await verifyOtp(jsonReq('https://canary.example.com/api/referrers/auth/verify', { email: VICTIM_EMAIL.toUpperCase(), code: '123456' }))
    expect(res.status).toBe(200)
  })
})
