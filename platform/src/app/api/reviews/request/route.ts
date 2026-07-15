import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { audit } from '@/lib/audit'
import { escapeHtml } from '@/lib/escape-html'

export async function POST(request: Request) {
  try {
    const { tenantId, tenant } = await getTenantForRequest()
    const { client_id, booking_id } = await request.json()

    if (!client_id) {
      return NextResponse.json({ error: 'client_id required' }, { status: 400 })
    }

    // Get client
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('name, email, phone')
      .eq('id', client_id)
      .eq('tenant_id', tenantId)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // booking_id is caller-supplied — verify it belongs to this tenant AND
    // this client before attaching it, otherwise a forged id would let the
    // review reference another tenant's (or another client's) booking. No
    // current read embeds bookings(...) off reviews, but the same FK-
    // ownership gap already proved live on the client-portal twin of this
    // route (register P15) — close it here too rather than leave a dangling
    // cross-tenant reference.
    let ownedBookingId: string | null = null
    if (booking_id) {
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('id', booking_id)
        .eq('tenant_id', tenantId)
        .eq('client_id', client_id)
        .maybeSingle()
      if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }
      ownedBookingId = booking.id
    }

    // Create review request record
    const { data: review } = await supabaseAdmin
      .from('reviews')
      .insert({
        tenant_id: tenantId,
        client_id,
        booking_id: ownedBookingId,
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

    // Send email if available
    if (client.email) {
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
    if (client.phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
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

    await audit({ tenantId, action: 'review.requested', entityType: 'review', entityId: review?.id, details: { client_id, booking_id: ownedBookingId } })

    return NextResponse.json({ review, sent: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
