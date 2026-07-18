import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { generateCode, createToken } from './token'
import { resolveTenantSmsCredentials } from '@/lib/sms-credentials'

// Verification codes now stored in portal_auth_codes table (serverless-safe)

export async function POST(request: Request) {
  const body = await request.json()
  const { action } = body

  if (action === 'send_code') {
    const { phone, tenant_slug } = body
    if (!phone || !tenant_slug) {
      return NextResponse.json({ error: 'Phone and tenant required' }, { status: 400 })
    }

    // Lowercase — slugs are always generated lowercase (slugify()/toSlug() in
    // every tenant-creation path, per tenant.ts/tenant-lookup.ts's shared
    // resolver contract), but this route hand-rolls its own tenants.slug
    // lookup instead of going through that resolver, so it never inherited
    // the normalization fix — a mixed-case tenant_slug (a caller other than
    // this route's own client, which lowercases client-side) would silently
    // 404 "Business not found" for a real tenant.
    const cleanSlug = String(tenant_slug).toLowerCase()

    // maybeSingle() (not single()), error checked explicitly — same
    // masked-error pattern already fixed on the canonical resolver
    // (tenant.ts/tenant-lookup.ts): slug is UNIQUE NOT NULL at the DB level,
    // so 0 rows legitimately means "unknown business" — the expected case,
    // not an error. single() can't tell that apart from a genuine DB
    // failure (both surface as data:null once destructured), so a real
    // outage here used to look identical to "Business not found" instead of
    // surfacing loud.
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, name, telnyx_api_key, telnyx_phone, sms_number, resend_api_key')
      .eq('slug', cleanSlug)
      .eq('status', 'active')
      .maybeSingle()

    if (tenantError) {
      console.error(`PORTAL_AUTH_TENANT_LOOKUP_ERROR slug=${cleanSlug} error=${tenantError.message}`)
      return NextResponse.json({ error: 'Unable to verify business. Please try again.' }, { status: 500 })
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Bucketed per tenant+phone, not phone alone — a phone number can belong to
    // clients of multiple tenants. Keying on phone alone let a caller exhaust
    // this budget for EVERY tenant that phone has an account with (a garbage
    // tenant_slug still consumed the shared bucket before this fix), a
    // cross-tenant denial-of-service on portal login.
    const rl = await rateLimitDb(`portal_auth:${tenant.id}:${phone}`, 5, 15 * 60 * 1000, { failClosed: true })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    // Look up client by phone
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, name, phone, email')
      .eq('tenant_id', tenant.id)
      .eq('phone', phone)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'No account found with this phone number' }, { status: 404 })
    }

    const code = generateCode()

    // Delete any existing unused codes for this phone — scoped to THIS tenant.
    // Without the tenant_id filter, the same phone across two tenants would let
    // tenant A's send_code call delete tenant B's still-valid pending code.
    await supabaseAdmin
      .from('portal_auth_codes')
      .delete()
      .eq('phone', phone)
      .eq('tenant_id', tenant.id)
      .eq('used', false)

    // Insert new code
    await supabaseAdmin.from('portal_auth_codes').insert({
      phone,
      code,
      tenant_id: tenant.id,
      client_id: client.id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })

    // Send code via SMS (preferred) or email (fallback)
    let channel: 'sms' | 'email' = 'sms'

    const smsCreds = resolveTenantSmsCredentials(tenant)
    if (smsCreds.apiKey && smsCreds.phone) {
      try {
        const { sendSMS } = await import('@/lib/sms')
        await sendSMS({
          to: phone,
          body: `Your ${tenant.name} verification code is: ${code}`,
          telnyxApiKey: smsCreds.apiKey,
          telnyxPhone: smsCreds.phone,
        })
      } catch (e) {
        console.error('SMS send error:', e)
        channel = 'email'
      }
    } else {
      channel = 'email'
    }

    // Fallback to email if SMS unavailable or failed
    if (channel === 'email' && client.email) {
      try {
        const { sendEmail } = await import('@/lib/email')
        await sendEmail({
          to: client.email,
          subject: `Your ${tenant.name} verification code`,
          html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
          resendApiKey: tenant.resend_api_key,
        })
      } catch (e) {
        console.error('Email send error:', e)
        return NextResponse.json({ error: 'Unable to send verification code. Contact the business.' }, { status: 503 })
      }
    } else if (channel === 'email' && !client.email) {
      return NextResponse.json({ error: 'SMS not configured and no email on file. Contact the business.' }, { status: 503 })
    }

    return NextResponse.json({ sent: true, channel })
  }

  if (action === 'verify_code') {
    const { phone, code, tenant_slug } = body
    if (!phone || !code || !tenant_slug) {
      return NextResponse.json({ error: 'Phone, code, and tenant required' }, { status: 400 })
    }

    // Lowercase — same resolver-normalization gap as send_code above.
    const cleanSlug = String(tenant_slug).toLowerCase()

    // Resolve the tenant the user is logging into so the code lookup is scoped
    // to that business. Without this, a phone+code row belonging to a DIFFERENT
    // tenant could satisfy verification (cross-tenant authentication).
    //
    // maybeSingle() + explicit error check — same masked-error pattern as
    // send_code above.
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', cleanSlug)
      .eq('status', 'active')
      .maybeSingle()

    if (tenantError) {
      console.error(`PORTAL_AUTH_VERIFY_TENANT_LOOKUP_ERROR slug=${cleanSlug} error=${tenantError.message}`)
      return NextResponse.json({ error: 'Unable to verify business. Please try again.' }, { status: 500 })
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // The 6-digit code has only 900,000 possible values and stays valid for 10
    // minutes — with no throttle here an attacker could brute-force it with
    // unlimited verify_code calls inside that window. Cap attempts per
    // phone+tenant the same as send_code so guessing is infeasible.
    const rl = await rateLimitDb(`portal_auth_verify:${tenant.id}:${phone}`, 5, 15 * 60 * 1000, { failClosed: true })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const { data: stored } = await supabaseAdmin
      .from('portal_auth_codes')
      .select('code, tenant_id, client_id, expires_at')
      .eq('phone', phone)
      .eq('tenant_id', tenant.id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!stored) {
      return NextResponse.json({ error: 'Code expired or not found' }, { status: 400 })
    }

    if (stored.code !== code) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
    }

    // Mark as used — scoped to the resolved tenant so a colliding phone+code row
    // in another tenant is never consumed by this verification.
    await supabaseAdmin
      .from('portal_auth_codes')
      .update({ used: true })
      .eq('phone', phone)
      .eq('code', code)
      .eq('tenant_id', tenant.id)

    const token = createToken(stored.client_id, stored.tenant_id)

    // Get client info
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .eq('id', stored.client_id)
      .single()

    // Get tenant info
    const { data: tenantInfo } = await supabaseAdmin
      .from('tenants')
      .select('id, name, primary_color, logo_url')
      .eq('id', stored.tenant_id)
      .single()

    return NextResponse.json({ token, client, tenant: tenantInfo })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
