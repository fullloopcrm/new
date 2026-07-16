import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { createReferrerToken, hashOtp } from '@/lib/referrer-portal-auth'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { safeEqual } from '@/lib/secret-compare'

// Escape LIKE/ILIKE wildcards so `email` is matched literally (Postgres default
// LIKE escape char is backslash). Without this, a caller could submit a
// '%'/'_'-bearing `email` that ILIKE-matches a DIFFERENT referrer's row,
// letting them burn that victim's OTP-verify rate-limit bucket (keyed off the
// caller's own literal email string, not the resolved row) instead of their
// own. Same pattern as client/check/route.ts's escapeLike.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

// Step 2 of referrer login: email + 6-digit code in → session token out.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const email = (body.email || '').trim()
  const code = (body.code || '').trim()
  if (!email || !code) return NextResponse.json({ error: 'Email and code required' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const rl = await rateLimitDb(`referrer_otp_verify:${ip}:${email.toLowerCase()}`, 8, 15 * 60 * 1000, { failClosed: true })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Unknown business' }, { status: 400 })

  const db = tenantDb(tenant.id)
  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data: referrer } = (await db
    .from('referrers')
    .select('id, referral_code, otp_hash, otp_expires_at')
    .ilike('email', escapeLike(email))
    .eq('status', 'active')
    .maybeSingle()) as { data: { id: string; referral_code: string; otp_hash: string | null; otp_expires_at: string | null } | null }

  // Constant-time compare: a plain === on the OTP hash lets an attacker recover
  // the full stored hash byte-by-byte from response latency, then brute-force
  // the 900k-code space offline in microseconds -- completely bypassing the
  // per-identifier rate limit above. Matches this file's own token verifier
  // (referrer-portal-auth.ts's verifyReferrerToken), which already does this.
  const valid =
    referrer &&
    referrer.otp_hash &&
    referrer.otp_expires_at &&
    new Date(referrer.otp_expires_at).getTime() > Date.now() &&
    safeEqual(hashOtp(code), referrer.otp_hash)

  if (!valid) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
  }

  // Atomic claim: re-check otp_hash still matches what was just verified in
  // the WHERE clause. Without this, two concurrent requests carrying the same
  // valid code (double-submit, retry) would both pass the `valid` check above
  // — read-then-clear leaves a window where both mint a session token from a
  // single-use OTP. Same fix as portal/auth's verify_code race.
  const { data: claimed } = await db
    .from('referrers')
    .update({ otp_hash: null, otp_expires_at: null })
    .eq('id', referrer.id)
    .eq('otp_hash', referrer.otp_hash)
    .select('id')
    .maybeSingle()
  if (!claimed) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
  }

  const token = createReferrerToken(referrer.id, tenant.id)
  return NextResponse.json({ token, referral_code: referrer.referral_code })
}
