import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { supabaseAdmin } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import { isCommEnabled } from '@/lib/comms-prefs'
import { sendSMS } from '@/lib/sms'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['scheduled', 'cancelled'],
  scheduled: ['confirmed', 'in_progress', 'cancelled', 'no_show'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed: ['paid'],
  cancelled: [],
  no_show: [],
  paid: [],
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantForRequest()
    const db = tenantDb(tenantId)
    const { id } = await params
    const { status } = await request.json()

    // Get current booking
    const { data: booking } = (await db
      .from('bookings')
      .select('status, client_id, start_time, service_type, clients(name, phone, email)')
      .eq('id', id)
      .single()) as {
        data: {
          status: string
          client_id: string | null
          start_time: string
          service_type: string | null
          clients: { name?: string | null; phone?: string | null; email?: string | null } | null
        } | null
      }

    if (!booking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const allowed = VALID_TRANSITIONS[booking.status] || []
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${booking.status} to ${status}` },
        { status: 400 }
      )
    }

    const { data, error } = await db
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Client cancellation notify — same email/SMS the old hard-delete cancel
    // flow sent, ported here since this status-transition endpoint (the real
    // "Cancel" now that Cancel and Delete are separate actions) previously
    // had none at all. Non-blocking: never fail the status change on a
    // notify error.
    if (status === 'cancelled' && booking.client_id) {
      try {
        const { data: tenantData } = await supabaseAdmin
          .from('tenants')
          .select('telnyx_api_key, telnyx_phone')
          .eq('id', tenantId)
          .single()
        const hasSMS = !!(tenantData?.telnyx_api_key && tenantData?.telnyx_phone)
        const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

        await notify({
          tenantId,
          type: 'booking_cancelled',
          title: `Booking Cancelled — ${date}`,
          message: `Your appointment on ${date} has been cancelled.`,
          channel: 'email',
          recipientType: 'client',
          recipientId: booking.client_id,
          bookingId: id,
          metadata: { clientName: booking.clients?.name, serviceName: booking.service_type },
        })

        if (booking.clients?.phone && hasSMS && (await isCommEnabled(tenantId, 'cancellation', 'sms'))) {
          sendSMS({
            to: booking.clients.phone,
            body: (await clientSmsTemplatesFor(tenantId)).cancellation({ start_time: booking.start_time }),
            telnyxApiKey: tenantData!.telnyx_api_key,
            telnyxPhone: tenantData!.telnyx_phone,
            tenantId,
            bookingId: id,
            smsType: 'cancellation',
          }).catch((err) => console.error('Cancellation SMS error:', err))
        }
      } catch (notifErr) {
        console.error('Cancellation notification error:', notifErr)
      }
    }

    // Sync the mirrored booking-mode deal to match the booking outcome:
    //   scheduled/confirmed/in_progress/completed/paid → sold
    //   cancelled/no_show                              → lost
    // Keyed by booking_id + mode='booking' so only the linked mirror deal
    // moves. Non-blocking: never fail the status change on a deal-sync error.
    const dealStage =
      ['scheduled', 'confirmed', 'in_progress', 'completed', 'paid'].includes(status) ? 'sold'
      : ['cancelled', 'no_show'].includes(status) ? 'lost'
      : null
    if (dealStage) {
      try {
        await db
          .from('deals')
          .update({ stage: dealStage })
          .eq('booking_id', id)
          .eq('mode', 'booking')
      } catch (dealErr) {
        console.error('Deal sync error (non-blocking):', dealErr)
      }
    }

    await audit({ tenantId, action: 'booking.status_changed', entityType: 'booking', entityId: id, details: { from: booking.status, to: status } })

    return NextResponse.json({ booking: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
