/**
 * Admin endpoint — resend booking confirmation (email or SMS) to the client
 * and/or the assigned team member. Uses the shared notify() helper which is
 * already tenant-aware. Tenant-scoped.
 *
 * Body: { bookingId, clientOnly?, channel? = 'email' | 'sms' }
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { bookingId, clientOnly, channel = 'email' } = await request.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, end_time, service_type, price, address, clients(id, name, email, phone, sms_consent, do_not_service), team_members!bookings_team_member_id_fkey(id, name, email, phone)')
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const client = booking.clients as unknown as { id?: string; name?: string; email?: string; phone?: string; sms_consent?: boolean | null; do_not_service?: boolean | null } | null
    const member = booking.team_members as unknown as { id?: string; name?: string; email?: string; phone?: string } | null
    const dateTime = booking.start_time ? new Date(booking.start_time).toLocaleString('en-US', {
      timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }) : ''

    const results: Array<Record<string, unknown>> = []

    // do_not_service blocks either channel; sms_consent (STOP compliance)
    // additionally blocks the sms channel — same invariant every other
    // client fan-out this session enforces.
    const clientChannelAllowed = client?.id && !client?.do_not_service
      && (channel !== 'sms' || client?.sms_consent !== false)

    if (clientChannelAllowed) {
      const r = await notify({
        tenantId,
        type: 'booking_confirmed',
        title: 'Your booking is confirmed',
        message: dateTime,
        channel: channel === 'sms' ? 'sms' : 'email',
        recipientType: 'client',
        recipientId: client!.id!,
        bookingId,
        metadata: {
          clientName: client!.name,
          serviceName: booking.service_type,
          dateTime,
          teamMemberName: member?.name,
          address: booking.address,
          price: booking.price ? `$${(booking.price / 100).toFixed(2)}` : undefined,
        },
      })
      results.push({ type: 'client_confirmation', ...r })
    } else if (client?.id) {
      results.push({ type: 'client_confirmation', success: false, error: 'blocked: do_not_service or sms_consent revoked' })
    }

    if (!clientOnly && member?.id) {
      const r = await notify({
        tenantId,
        type: 'team_confirm_request',
        title: 'New assignment',
        message: `${client?.name || 'Client'} — ${dateTime}`,
        channel: channel === 'sms' ? 'sms' : 'email',
        recipientType: 'team_member',
        recipientId: member.id,
        bookingId,
        metadata: {
          clientName: client?.name,
          dateTime,
          address: booking.address,
        },
      })
      results.push({ type: 'team_assignment', ...r })
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('send-booking-emails error:', err)
    return NextResponse.json({ error: 'Send failed' }, { status: 500 })
  }
}
