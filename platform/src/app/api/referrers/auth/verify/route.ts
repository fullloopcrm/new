import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { createReferrerToken, hashOtp } from '@/lib/referrer-portal-auth'
import { rateLimitDb } from '@/lib/rate-limit-db'

// Step 2 of referrer login: email + 6-digit code in → session token out.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const email = (body.email || '').trim()
  const code = (body.code || '').trim()
  if (!email || !code) return NextResponse.json({ error: 'Email and code required' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const rl = await rateLimitDb(`referrer_otp_verify:${ip}:${email.toLowerCase()}`, 8, 15 * 60 * 1000)
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
    .ilike('email', email)
    .eq('status', 'active')
    .maybeSingle()) as { data: { id: string; referral_code: string; otp_hash: string | null; otp_expires_at: string | null } | null }

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
  await db
    .from('referrers')
    .update({ otp_hash: null, otp_expires_at: null })
    .eq('id', referrer.id)

  const token = createReferrerToken(referrer.id, tenant.id)
  return NextResponse.json({ token, referral_code: referrer.referral_code })
}
