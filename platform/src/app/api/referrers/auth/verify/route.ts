import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { createReferrerToken, hashOtp } from '@/lib/referrer-portal-auth'
import { rateLimitDb } from '@/lib/rate-limit-db'

// Step 2 of referrer login: email + 6-digit code in → session token out.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const email = (body.email || '').trim()
  const code = (body.code || '').trim()
  if (!email || !code) return NextResponse.json({ error: 'Email and code required' }, { status: 400 })

  // Throttle code verification so a 6-digit code can't be brute-forced.
  // Primary cap is per-email: once attempts land in the window, further
  // guesses against THAT email's code are blocked regardless of source IP
  // (a composite ip+email key would reset every time the attacker rotates
  // IP). A looser per-IP cap adds defense against one host spraying codes
  // across many emails. Both fail closed -- a DB outage here must deny
  // rather than allow unlimited brute force. Mirrors pin-reset/route.ts +
  // portal/auth/route.ts.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rlEmail = await rateLimitDb(`referrer_otp_verify:${email.toLowerCase()}`, 8, 15 * 60 * 1000, {
    failClosed: true,
  })
  const rlIp = await rateLimitDb(`referrer_otp_verify_ip:${ip}`, 30, 15 * 60 * 1000, { failClosed: true })
  if (!rlEmail.allowed || !rlIp.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Unknown business' }, { status: 400 })

  const { data: referrer } = await supabaseAdmin
    .from('referrers')
    .select('id, referral_code, otp_hash, otp_expires_at')
    .eq('tenant_id', tenant.id)
    .ilike('email', email)
    .eq('status', 'active')
    .maybeSingle()

  const valid =
    referrer &&
    referrer.otp_hash &&
    referrer.otp_expires_at &&
    new Date(referrer.otp_expires_at).getTime() > Date.now() &&
    referrer.otp_hash === hashOtp(code)

  if (!valid) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
  }

  // Single-use: clear the code as soon as it's spent.
  await supabaseAdmin
    .from('referrers')
    .update({ otp_hash: null, otp_expires_at: null })
    .eq('id', referrer.id)

  const token = createReferrerToken(referrer.id, tenant.id)
  return NextResponse.json({ token, referral_code: referrer.referral_code })
}
