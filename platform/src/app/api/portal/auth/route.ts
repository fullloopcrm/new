import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
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

    // Look up client by phone. clients.phone has no uniqueness constraint
    // (idx_clients_tenant_phone is a plain index, not unique) — .single()
    // THROWS when 2+ clients share a phone in the same tenant, and since
    // the error wasn't checked, `client` silently fell back to null: a
    // legitimate client with any duplicate phone row got a permanent 404
    // "No account found," locked out of self-service portal login entirely.
    // Same failure class as webhooks/telnyx/route.ts's findByPhone —
    // limit(2) instead of single(), pick the first deterministically, log
    // loudly if ambiguous.
    const { data: clientMatches } = await supabaseAdmin
      .from('clients')
      .select('id, name, phone, email')
      .eq('tenant_id', tenant.id)
      .eq('phone', phone)
      .order('id', { ascending: true })
      .limit(2)

    if (clientMatches && clientMatches.length > 1) {
      console.error(`[portal auth] phone ${phone} matches ${clientMatches.length} clients for tenant ${tenant.id} — dedupe needed; using id=${clientMatches[0].id}`)
    }
    const client = clientMatches?.[0] || null

    if (!client) {
      return NextResponse.json({ error: 'No account found with this phone number' }, { status: 404 })
    }

    const code = generateCode()

    // Delete any existing unused codes for this phone
    await supabaseAdmin
      .from('portal_auth_codes')
      .delete()
      .eq('phone', phone)
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

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`portal_auth_verify:${ip}:${phone}`, 5, 15 * 60 * 1000, { failClosed: true })
    if (!rl.allowed) {
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

    // Compare-and-swap the consume: re-assert used=false in the UPDATE's own
    // WHERE and check whether a row actually flipped. The SELECT above only
    // proves the code was unused at READ time -- two concurrent verify_code
    // calls for the same still-valid code both pass that SELECT before
    // either UPDATE lands, and a blind UPDATE (no used=false re-check) would
    // match and succeed for BOTH regardless of order, letting one single-use
    // login code mint two separate sessions. The loser now gets a clean
    // "already used" instead of a second silently-issued token.
    const { data: consumed } = await supabaseAdmin
      .from('portal_auth_codes')
      .update({ used: true })
      .eq('phone', phone)
      .eq('code', code)
      .eq('tenant_id', tenant.id)
      .eq('used', false)
      .select()
      .maybeSingle()

    if (!consumed) {
      return NextResponse.json({ error: 'Code already used — request a new one' }, { status: 401 })
    }

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
