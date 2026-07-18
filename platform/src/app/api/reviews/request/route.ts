import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { audit } from '@/lib/audit'
import { escapeHtml } from '@/lib/escape-html'
import { requirePermission } from '@/lib/require-permission'

export async function POST(request: Request) {
  try {
    const { tenant: tenantCtx, error: authError } = await requirePermission('reviews.request')
    if (authError) return authError
    const tenantId = tenantCtx.tenantId
    const tenant = tenantCtx.tenant
    const { client_id, booking_id } = await request.json()

    if (!client_id) {
      return NextResponse.json({ error: 'client_id required' }, { status: 400 })
    }

    // Get client
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('name, email, phone, sms_consent, do_not_service')
      .eq('id', client_id)
      .eq('tenant_id', tenantId)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Create review request record
    const { data: review } = await supabaseAdmin
      .from('reviews')
      .insert({
        tenant_id: tenantId,
        client_id,
        booking_id: booking_id || null,
        status: 'pending',
        requested_at: new Date().toISOString(),
        source: 'internal',
      })
      .select()
      .single()

    // Build Google review URL
    const googleUrl = tenant.google_place_id
      ? `https://search.google.com/local/writereview?placeid=${tenant.google_place_id}`
      : null

    const message = `Hi ${client.name}, thank you for choosing ${tenant.name}! We'd love your feedback.${
      googleUrl ? ` Leave us a review: ${googleUrl}` : ''
    }`

    // do_not_service is a stronger, channel-agnostic kill-switch than
    // sms_consent (see notify.ts) -- a DNS-flagged client gets neither
    // channel. sms_consent === false (a STOP reply) only blocks SMS.
    // Send email if available
    if (client.email && !client.do_not_service) {
      try {
        await sendEmail({
          to: client.email,
          subject: `How was your experience with ${tenant.name}?`,
          html: `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
          resendApiKey: tenant.resend_api_key,
        })
      } catch (e) {
        console.error('Review email error:', e)
      }
    }

    // Send SMS if available
    if (client.phone && client.sms_consent !== false && !client.do_not_service && tenant.telnyx_api_key && tenant.telnyx_phone) {
      try {
        await sendSMS({
          to: client.phone,
          body: message,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        })
      } catch (e) {
        console.error('Review SMS error:', e)
      }
    }

    await audit({ tenantId, action: 'review.requested', entityType: 'review', entityId: review?.id, details: { client_id, booking_id: booking_id || null } })

    return NextResponse.json({ review, sent: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
