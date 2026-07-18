import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { sendEmail } from '@/lib/email'
import { hashOtp } from '@/lib/referrer-portal-auth'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { randomInt } from 'crypto'
import { escapeHtml } from '@/lib/escape-html'
import { safeColor } from '@/lib/safe-color'

const OTP_TTL_MS = 10 * 60 * 1000

// Escape LIKE/ILIKE wildcards so the lookup only ever matches the literal
// address. Unescaped, a caller-controlled '%'/'_' lets an attacker rotate
// the submitted `email` string (e.g. adding/removing wildcard chars) while
// still matching the SAME target referrer row — bypassing the per-email
// rate-limit key below, which assumes `email` uniquely identifies the
// target. Same pattern as lib/inbound-email-tenant.ts's escapeLike() and
// ../../route.ts's fix for the sibling code/email lookup.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

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

  const { data: referrer } = await supabaseAdmin
    .from('referrers')
    .select('id, name, email')
    .eq('tenant_id', tenant.id)
    .ilike('email', escapeLike(email))
    .eq('status', 'active')
    .maybeSingle()

  if (referrer) {
    // Crypto RNG — Math.random() is predictable and unsafe for a login OTP.
    const code = String(100000 + randomInt(0, 900000))
    await supabaseAdmin
      .from('referrers')
      .update({ otp_hash: hashOtp(code), otp_expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString() })
      .eq('id', referrer.id)

    const brand = t?.name || 'Referral Portal'
    // tenant.name/primary_color are self-serve free text with no format
    // enforcement — they land raw in the HTML body below. `brand` needs
    // HTML-escaping (text content); `color` needs CSS-color validation
    // (a `style="..."` CSS-declaration context, where quote-escaping alone
    // wouldn't stop an extra `;`-delimited declaration being smuggled in).
    const color = safeColor(t?.primary_color, '#0d9488')
    const from = t?.resend_domain ? `${brand} <noreply@${t.resend_domain}>` : undefined
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px">
        <h2 style="color:${color};margin:0 0 8px">Your login code</h2>
        <p style="color:#475569;font-size:14px;margin:0 0 20px">Enter this code to view your ${escapeHtml(brand)} referral earnings.</p>
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
