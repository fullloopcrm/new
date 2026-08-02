/**
 * Sales Partner portal login: email + 6-digit PIN, scoped to the tenant this
 * request came in on. Ported from nycmaid src/app/api/sales-partners/login/route.ts,
 * hardened for multi-tenant: tenant resolved from the request host (not a
 * global lookup), and issues a signed session token (createSalesPartnerToken)
 * instead of nycmaid's raw id/name/ref_code payload for the client to hold
 * unsigned in localStorage.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { verifyPin, generatePin, hashPin } from '@/lib/sales-partner-auth'
import { createSalesPartnerToken } from '@/lib/sales-partner-portal-auth'
import { logAuthFailure } from '@/lib/error-tracking'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.action === 'request_pin') {
      return handleRequestPin(body, request)
    }

    const { email, pin } = body
    if (!email || !pin) {
      return NextResponse.json({ error: 'Email and PIN required' }, { status: 400 })
    }

    // PIN space is only 10^6 -- rate limit hard per IP+email (5/15min), tighter
    // than the 10/10min public-lookup limits elsewhere, since this gates login.
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rl = await rateLimitDb(`sales-partner-login:${ip}:${String(email).toLowerCase()}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) {
      await logAuthFailure({ surface: 'sales-partners/login', ip, identifier: String(email), lockedOut: true })
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const tenant = await getTenantFromHeaders()
    if (!tenant) return NextResponse.json({ error: 'Unknown business' }, { status: 400 })

    const { data: partner, error } = await supabaseAdmin
      .from('sales_partners')
      .select('id, name, email, referral_code, pin_hash, pin_salt, active')
      .eq('tenant_id', tenant.id)
      .ilike('email', String(email).trim())
      .eq('active', true)
      .maybeSingle()

    if (error || !partner || !verifyPin(String(pin), partner.pin_hash as string, partner.pin_salt as string)) {
      await logAuthFailure({ surface: 'sales-partners/login', tenantId: tenant.id, ip, identifier: String(email), lockedOut: false, remaining: rl.remaining })
      return NextResponse.json({ error: 'Invalid email or PIN' }, { status: 401 })
    }

    const token = createSalesPartnerToken(partner.id as string, tenant.id)
    return NextResponse.json({
      token,
      id: partner.id,
      name: partner.name,
      email: partner.email,
      referral_code: partner.referral_code,
    })
  } catch (err) {
    console.error('Sales partner login error:', err)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

/** "Forgot my PIN" — mint a fresh PIN, email it. Same shape as team-portal/client-portal request_pin. */
async function handleRequestPin(body: { email?: string }, request: Request) {
  const email = String(body.email || '').trim()
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const rl = await rateLimitDb(`sales-partner-pin-request:${ip}:${email.toLowerCase()}`, 5, 15 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Unknown business' }, { status: 400 })

  const { data: partner } = await supabaseAdmin
    .from('sales_partners')
    .select('id, name, email')
    .eq('tenant_id', tenant.id)
    .ilike('email', email)
    .eq('active', true)
    .maybeSingle()

  // Always the same response regardless of match, so this can't be used to
  // probe which emails are approved sales partners.
  if (!partner) {
    return NextResponse.json({ sent: true })
  }

  const newPin = generatePin()
  const { pinHash, pinSalt } = hashPin(newPin)

  const { error: updErr } = await supabaseAdmin
    .from('sales_partners')
    .update({ pin_hash: pinHash, pin_salt: pinSalt })
    .eq('id', partner.id)
  if (updErr) {
    return NextResponse.json({ error: 'Could not set a new PIN. Try again.' }, { status: 500 })
  }

  try {
    const { sendEmail, tenantSender } = await import('@/lib/email')
    await sendEmail({
      to: partner.email,
      from: tenantSender(tenant),
      subject: `Your ${tenant.name} sales partner portal PIN`,
      html: `<p>Your ${tenant.name} sales partner portal PIN is: <strong>${newPin}</strong></p>`,
      resendApiKey: (tenant as { resend_api_key?: string }).resend_api_key,
    })
  } catch (e) {
    console.error('[sales-partners/login] request_pin email send error:', e)
    return NextResponse.json({ error: 'Unable to send your PIN. Contact the business.' }, { status: 503 })
  }

  return NextResponse.json({ sent: true })
}
