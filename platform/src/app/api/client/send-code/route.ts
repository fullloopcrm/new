import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { randomInt } from 'crypto'

function codeEmailHtml(businessName: string, code: string): string {
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 12px 0;">Your ${businessName} verification code</h2>
      <p style="font-size:32px;font-weight:700;letter-spacing:4px;margin:16px 0;">${code}</p>
      <p style="color:#666;font-size:14px;">This code expires in 10 minutes.</p>
    </div>`
}

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  try {
    const { email, phone } = await request.json().catch(() => ({})) as { email?: string; phone?: string }
    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone required' }, { status: 400 })
    }

    const identifier = email ? email.toLowerCase().trim() : `sms:${phone!.replace(/\D/g, '')}`

    const rl = await rateLimitDb(`client-send-code:${tenant.id}:${identifier}`, 3, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please wait 10 minutes.' }, { status: 429 })
    }

    const code = String(100000 + randomInt(0, 900000))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: dbError } = await supabaseAdmin
      .from('verification_codes')
      .upsert(
        { tenant_id: tenant.id, identifier, code, expires_at: expiresAt, used: false },
        { onConflict: 'tenant_id,identifier' },
      )
    if (dbError) {
      console.error('verification_codes upsert failed:', dbError)
      return NextResponse.json({ error: 'Failed to store code' }, { status: 500 })
    }

    const smsBody = `Your ${tenant.name} verification code is: ${code}`

    if (email) {
      try {
        await sendEmail({
          to: email,
          subject: `Your ${tenant.name} verification code`,
          html: codeEmailHtml(tenant.name, code),
          resendApiKey: tenant.resend_api_key,
          from: tenant.email_from || undefined,
        })
        // Best-effort SMS alongside email when phone also present.
        if (phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
          await sendSMS({
            to: phone,
            body: smsBody,
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          }).catch(() => {})
        }
        return NextResponse.json({ success: true, method: 'email' })
      } catch (e) {
        console.error('email send failed, falling back to SMS:', e)
        if (!phone) return NextResponse.json({ error: 'Failed to send code' }, { status: 500 })
      }
    }

    if (phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
      try {
        await sendSMS({
          to: phone,
          body: smsBody,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        })
        return NextResponse.json({ success: true, method: 'sms' })
      } catch (e) {
        console.error('sms send failed:', e)
        return NextResponse.json({ error: 'Failed to send code' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'No delivery method available' }, { status: 500 })
  } catch (err) {
    console.error('send-code error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
