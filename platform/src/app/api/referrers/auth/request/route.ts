import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { sendEmail } from '@/lib/email'
import { hashOtp } from '@/lib/referrer-portal-auth'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { escapeLikeValue } from '@/lib/postgrest-safe'

const OTP_TTL_MS = 10 * 60 * 1000

// Step 1 of referrer login: email in → email a 6-digit code out.
// Always responds { ok: true } regardless of whether the email matches a
// referrer, so this endpoint can't be used to enumerate who's a partner.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const email = (body.email || '').trim()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Same per-identifier + per-IP split as verify/route.ts: a composite
  // ip+email key resets every time the attacker rotates IP, letting them
  // spray OTP requests (and re-arm the guessable code) against one email
  // forever. Both fail closed for the same reason as the verify step.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rlEmail = await rateLimitDb(`referrer_otp_req:${email.toLowerCase()}`, 5, 15 * 60 * 1000, {
    failClosed: true,
  })
  const rlIp = await rateLimitDb(`referrer_otp_req_ip:${ip}`, 30, 15 * 60 * 1000, { failClosed: true })
  if (!rlEmail.allowed || !rlIp.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Unknown business' }, { status: 400 })

  // Load the tenant's branding + email sender in one shot.
  const { data: t } = await supabaseAdmin
    .from('tenants')
    .select('name, primary_color, resend_api_key, resend_domain')
    .eq('id', tenant.id)
    .single()

  const db = tenantDb(tenant.id)
  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data: referrer } = (await db
    .from('referrers')
    .select('id, name, email')
    .eq('tenant_id', tenant.id)
    .ilike('email', escapeLikeValue(email))
    .eq('status', 'active')
    .maybeSingle()) as { data: { id: string; name: string; email: string } | null }

  if (referrer) {
    // crypto.randomInt is uniformly distributed and cryptographically strong;
    // Math.random was brute-forceable with timing knowledge (same fix as
    // src/app/api/portal/auth/token.ts's generateCode).
    const code = String(100000 + crypto.randomInt(0, 900000))
    await supabaseAdmin
      .from('referrers')
      .update({ otp_hash: hashOtp(code), otp_expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString() })
      .eq('id', referrer.id)

    const brand = t?.name || 'Referral Portal'
    const color = t?.primary_color || '#0d9488'
    const from = t?.resend_domain ? `${brand} <noreply@${t.resend_domain}>` : undefined
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px">
        <h2 style="color:${color};margin:0 0 8px">Your login code</h2>
        <p style="color:#475569;font-size:14px;margin:0 0 20px">Enter this code to view your ${brand} referral earnings.</p>
        <div style="background:#f1f5f9;border-radius:12px;padding:20px;text-align:center;font-size:32px;font-weight:700;letter-spacing:6px;color:#0f172a">${code}</div>
        <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
      </div>`

    try {
      await sendEmail({
        to: referrer.email,
        subject: `${code} is your ${brand} login code`,
        html,
        from,
        resendApiKey: t?.resend_api_key || undefined,
      })
    } catch {
      // Swallow send failures so we don't leak whether the address exists;
      // the referrer can retry. (Delivery errors are logged upstream in sendEmail.)
    }
  }

  return NextResponse.json({ ok: true })
}
