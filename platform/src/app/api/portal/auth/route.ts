import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import crypto from 'crypto'

const SECRET = process.env.PORTAL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY!

function generateCode(): string {
  // crypto.randomInt is uniformly distributed and cryptographically strong;
  // Math.random was brute-forceable with timing knowledge.
  return String(100000 + crypto.randomInt(0, 900000))
}

function createToken(clientId: string, tenantId: string): string {
  const payload = JSON.stringify({ id: clientId, tid: tenantId, exp: Date.now() + 24 * 3600 * 1000 })
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}

export function verifyPortalToken(token: string): { id: string; tid: string } | null {
  try {
    const [payloadB64, sig] = token.split('.')
    const payload = Buffer.from(payloadB64, 'base64').toString()
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
    if (sig !== expected) return null
    const data = JSON.parse(payload)
    if (data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}

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
