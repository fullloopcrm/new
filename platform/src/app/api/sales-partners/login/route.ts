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
import { verifyPin } from '@/lib/sales-partner-auth'
import { createSalesPartnerToken } from '@/lib/sales-partner-portal-auth'

export async function POST(request: Request) {
  try {
    const { email, pin } = await request.json()
    if (!email || !pin) {
      return NextResponse.json({ error: 'Email and PIN required' }, { status: 400 })
    }

    // PIN space is only 10^6 -- rate limit hard per IP+email (5/15min), tighter
    // than the 10/10min public-lookup limits elsewhere, since this gates login.
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rl = await rateLimitDb(`sales-partner-login:${ip}:${String(email).toLowerCase()}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) {
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
