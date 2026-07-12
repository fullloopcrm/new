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

    const rl = await rateLimitDb(`portal_auth:${phone}`, 5, 15 * 60 * 1000)
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
    const { phone, code } = body
    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code required' }, { status: 400 })
    }

    // Throttle code verification so a 6-digit code can't be brute-forced.
    // Primary cap is per-phone (identifier): once 5 wrong guesses land in the
    // window, further attempts against THAT phone's code are blocked regardless
    // of source IP — which is what actually defeats a brute-force. A looser
    // per-IP cap adds defense against one host spraying codes across many
    // phones. (slug isn't part of the verify payload; phone is globally unique.)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rlPhone = await rateLimitDb(`portal_verify:${phone}`, 5, 15 * 60 * 1000, { failClosed: true })
    const rlIp = await rateLimitDb(`portal_verify_ip:${ip}`, 30, 15 * 60 * 1000, { failClosed: true })
    if (!rlPhone.allowed || !rlIp.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const { data: stored } = await supabaseAdmin
      .from('portal_auth_codes')
      .select('code, tenant_id, client_id, expires_at')
      .eq('phone', phone)
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

    // Mark as used
    await supabaseAdmin
      .from('portal_auth_codes')
      .update({ used: true })
      .eq('phone', phone)
      .eq('code', code)

    const token = createToken(stored.client_id, stored.tenant_id)

    // Get client info
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .eq('id', stored.client_id)
      .single()

    // Get tenant info
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, primary_color, logo_url')
      .eq('id', stored.tenant_id)
      .single()

    return NextResponse.json({ token, client, tenant })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
