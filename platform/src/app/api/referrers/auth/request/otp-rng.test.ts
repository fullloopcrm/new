import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 INDEPENDENT verification lane for the referrer-login OTP RNG fix (49f8f5e2).
 *
 * Fix 49f8f5e2 replaced `Math.floor(100000 + Math.random() * 900000)` with
 * `100000 + randomInt(0, 900000)` from node:crypto. Math.random() is not
 * cryptographically secure — its output is predictable from observed samples,
 * so an attacker could narrow/predict a valid login OTP and take over a
 * referrer's account.
 *
 * This suite locks the CSPRNG usage WITHOUT spying the `crypto` module import
 * directly — esbuild/vite-node's CJS interop copies named imports of built-in
 * modules onto a fresh namespace at import time, so `vi.spyOn(crypto,
 * 'randomInt')` does not reliably intercept route.ts's own `import {
 * randomInt } from 'crypto'` call sites. Instead: pin `Math.random()` to a
 * FIXED deterministic value. If the route still used the old
 * `Math.floor(100000 + Math.random() * 900000)` formula, every generated code
 * would collapse to the SAME value (100000, since Math.random()=>0). Proving
 * (a) Math.random() is never called and (b) two consecutive requests mint
 * DIFFERENT codes together rule out a Math.random()-based generator — the
 * only way both hold is a real per-call CSPRNG source.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'
const REFERRER = '11111111-0000-0000-0000-000000000001'
const EMAIL = 'partner@example.com'

type Row = Record<string, unknown>

const updates: Array<{ table: string; payload: Row }> = []

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const c: Record<string, unknown> = {
      select: () => c,
      update: (payload: Row) => { updates.push({ table, payload }); return c },
      eq: () => c,
      ilike: () => c,
      single: async () => {
        if (table === 'tenants') return { data: { name: 'Canary', primary_color: '#000', resend_api_key: null, resend_domain: null }, error: null }
        return { data: null, error: null }
      },
      maybeSingle: async () => {
        if (table === 'referrers') return { data: { id: REFERRER, name: 'Partner', email: EMAIL }, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown[]; error: null }) => unknown) => res({ data: [], error: null }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT, name: 'Canary', slug: 'canary' }),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 5 }) }))

const emailSends: Array<{ html?: string }> = []
vi.mock('@/lib/email', () => ({
  sendEmail: async (a: { html?: string }) => { emailSends.push(a); return {} },
}))

import { NextRequest } from 'next/server'
import { POST } from './route'
import { hashOtp } from '@/lib/referrer-portal-auth'

function req(): NextRequest {
  return new NextRequest('https://canary.example.com/api/referrers/auth/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL }),
  })
}

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
  updates.length = 0
  emailSends.length = 0
})

function extractCode(html: string | undefined): string {
  // The code sits alone inside its own div: `...">482913</div>`. A plain
  // /\d{6}/ scan is NOT safe here — the template's inline CSS hex colors
  // (e.g. #475569) are themselves six consecutive decimal digits and appear
  // earlier in the markup, so a loose scan grabs the wrong match.
  const m = html?.match(/>(\d{6})<\/div>/)
  if (!m) throw new Error('OTP code not found in email body')
  return m[1]
}

describe('W4 referrer login OTP: cryptographically-secure RNG', () => {
  it('never calls Math.random, and mints a DIFFERENT code per request (rules out a Math.random()-based generator)', async () => {
    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

    const res1 = await POST(req())
    expect(res1.status).toBe(200)
    const code1 = extractCode(emailSends[0]?.html)

    updates.length = 0
    emailSends.length = 0

    const res2 = await POST(req())
    expect(res2.status).toBe(200)
    const code2 = extractCode(emailSends[0]?.html)

    // Math.random() is pinned to 0 for both calls. The old formula
    // (Math.floor(100000 + Math.random()*900000)) would deterministically
    // produce "100000" both times if it were still in use.
    expect(mathSpy).not.toHaveBeenCalled()
    expect(code1).not.toBe('100000')
    expect(code2).not.toBe('100000')
    expect(code1).not.toBe(code2)

    mathSpy.mockRestore()
  })

  it('the stored otp_hash matches hashOtp() of the exact code emailed — real code, not a stub', async () => {
    await POST(req())

    expect(updates).toHaveLength(1)
    expect(updates[0].table).toBe('referrers')
    const storedHash = updates[0].payload.otp_hash as string
    expect(typeof storedHash).toBe('string')

    // Recover the plaintext code from the email body and confirm the hash matches.
    expect(emailSends).toHaveLength(1)
    const emailedCode = extractCode(emailSends[0].html)
    expect(Number(emailedCode)).toBeGreaterThanOrEqual(100000)
    expect(Number(emailedCode)).toBeLessThanOrEqual(999999)
    expect(storedHash).toBe(hashOtp(emailedCode))
  })
})
