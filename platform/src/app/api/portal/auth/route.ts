import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { generateCode, createToken } from './token'

// Verification codes now stored in portal_auth_codes table (serverless-safe)

export async function POST(request: Request) {
  const body = await request.json()
  const { action } = body

  if (action === 'send_code') {
    const { phone, tenant_slug } = body
    if (!phone || !tenant_slug) {
      return NextResponse.json({ error: 'Phone and tenant required' }, { status: 400 })
    }

    const rl = await rateLimitDb(`portal_auth:${phone}`, 5, 15 * 60 * 1000, { failClosed: true })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    // Look up tenant
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, telnyx_api_key, telnyx_phone, resend_api_key')
      .eq('slug', tenant_slug)
      .eq('status', 'active')
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Look up client by phone
    const db = tenantDb(tenant.id)
    // tenantDb's select() takes a non-literal `columns` param, which widens
    // supabase-js's column-string type inference — cast to the shape actually selected.
    const { data: client } = (await db
      .from('clients')
      .select('id, name, phone, email')
      .eq('phone', phone)
      .single()) as { data: { id: string; name: string; phone: string; email: string | null } | null }

    if (!client) {
      return NextResponse.json({ error: 'No account found with this phone number' }, { status: 404 })
    }

    const code = generateCode()

    // Delete any existing unused codes for this phone
    await db
      .from('portal_auth_codes')
      .delete()
      .eq('phone', phone)
      .eq('used', false)

    // Insert new code
    await db.from('portal_auth_codes').insert({
      phone,
      code,
      client_id: client.id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })

    // Send code via SMS (preferred) or email (fallback)
    let channel: 'sms' | 'email' = 'sms'

    if (tenant.telnyx_api_key && tenant.telnyx_phone) {
      try {
        const { sendSMS } = await import('@/lib/sms')
        await sendSMS({
          to: phone,
          body: `Your ${tenant.name} verification code is: ${code}`,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
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

    // Throttle code verification so a 6-digit code can't be brute-forced.
    // Primary cap is per-phone (identifier): once 5 wrong guesses land in the
    // window, further attempts against THAT phone's code are blocked regardless
    // of source IP — which is what actually defeats a brute-force. A looser
    // per-IP cap adds defense against one host spraying codes across many
    // phones.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rlPhone = await rateLimitDb(`portal_verify:${phone}`, 5, 15 * 60 * 1000, { failClosed: true })
    const rlIp = await rateLimitDb(`portal_verify_ip:${ip}`, 30, 15 * 60 * 1000, { failClosed: true })
    if (!rlPhone.allowed || !rlIp.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    // Resolve the tenant the user is logging into so the code lookup is scoped
    // to that business. Without this, a phone+code row belonging to a DIFFERENT
    // tenant (e.g. the same phone number used across two businesses on the
    // platform) could satisfy verification — cross-tenant authentication.
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', tenant_slug)
      .eq('status', 'active')
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`portal_auth_verify:${ip}:${phone}`, 5, 15 * 60 * 1000, { failClosed: true })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    // Tenant isn't known yet at this point — the client only has phone+code,
    // not a tenant slug — so this lookup must scan across tenants (like a
    // token lookup) before we can resolve which tenant's wrapper to use.
    const { data: stored } = await supabaseAdmin
      .from('portal_auth_codes') // tenant-scope-ok: tenant unknown until code resolves; code+phone combo is the auth token here
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

    // Mark as used — scoped to the resolved tenant so a colliding phone+code
    // row in another tenant is never consumed by this verification.
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
