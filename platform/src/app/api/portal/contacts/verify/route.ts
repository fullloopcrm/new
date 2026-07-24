import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { tenantSender } from '@/lib/email'
import { generateCode, verifyPortalToken } from '../../auth/token'

// Verifies ownership of a NEW phone/email before it can opt into comms.
// Reuses the exact OTP primitives from /api/portal/auth (generateCode,
// rate-limited send, timing-safe-adjacent single-use codes) rather than a
// parallel mechanism — see portal_contact_verify_codes migration for why
// this is a separate table from portal_auth_codes (that one is keyed by
// phone for LOGIN and would collide with this per-contact use).

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { action, contact_id, channel } = body
  if (!contact_id || (channel !== 'sms' && channel !== 'email')) {
    return NextResponse.json({ error: 'contact_id and a valid channel are required' }, { status: 400 })
  }

  const db = tenantDb(auth.tid)
  const { data: contact } = await db
    .from('client_contacts')
    .select('id, phone_e164, email')
    .eq('id', contact_id)
    .eq('client_id', auth.id)
    .single()
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const targetValue = channel === 'sms' ? contact.phone_e164 : contact.email
  if (!targetValue) {
    return NextResponse.json({ error: `This contact has no ${channel === 'sms' ? 'phone number' : 'email address'}` }, { status: 400 })
  }

  if (action === 'send_code') {
    const rl = await rateLimitDb(`portal_contact_verify:${auth.id}:${contact_id}:${channel}`, 5, 15 * 60 * 1000, { failClosed: true })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, slug, email_from, telnyx_api_key, telnyx_phone, resend_api_key')
      .eq('id', auth.tid)
      .single()
    if (!tenant) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const code = generateCode()

    await db
      .from('portal_contact_verify_codes')
      .delete()
      .eq('contact_id', contact_id)
      .eq('channel', channel)
      .eq('used', false)

    await db.from('portal_contact_verify_codes').insert({
      client_id: auth.id,
      contact_id,
      channel,
      target_value: targetValue,
      code,
      used: false,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })

    try {
      if (channel === 'sms') {
        if (!tenant.telnyx_api_key || !tenant.telnyx_phone) {
          return NextResponse.json({ error: 'SMS is not configured for this business' }, { status: 503 })
        }
        const { sendSMS } = await import('@/lib/sms')
        await sendSMS({
          to: targetValue,
          body: `Your ${tenant.name} verification code is: ${code}`,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        })
      } else {
        const { sendEmail } = await import('@/lib/email')
        await sendEmail({
          to: targetValue,
          subject: `Your ${tenant.name} verification code`,
          html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
          from: tenantSender(tenant),
          resendApiKey: tenant.resend_api_key,
        })
      }
    } catch (e) {
      console.error('Contact verify send error:', e)
      return NextResponse.json({ error: 'Unable to send verification code' }, { status: 503 })
    }

    return NextResponse.json({ sent: true })
  }

  if (action === 'confirm_code') {
    const { code } = body
    if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

    const rl = await rateLimitDb(`portal_contact_verify_confirm:${auth.id}:${contact_id}:${channel}`, 5, 15 * 60 * 1000, { failClosed: true })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const { data: stored } = await db
      .from('portal_contact_verify_codes')
      .select('id, code')
      .eq('contact_id', contact_id)
      .eq('channel', channel)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!stored) return NextResponse.json({ error: 'Code expired or not found' }, { status: 400 })
    if (stored.code !== code) return NextResponse.json({ error: 'Invalid code' }, { status: 401 })

    await db.from('portal_contact_verify_codes').update({ used: true }).eq('id', stored.id)

    const now = new Date().toISOString()
    const consentField = channel === 'sms' ? 'sms_consent_at' : 'email_consent_at'
    const receivesField = channel === 'sms' ? 'receives_sms' : 'receives_email'

    const { data: updated, error } = await db
      .from('client_contacts')
      .update({ [receivesField]: true, [consentField]: now })
      .eq('id', contact_id)
      .eq('client_id', auth.id)
      .select('id, name, role, phone_e164, email, is_primary, receives_sms, receives_email')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contact: updated })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
