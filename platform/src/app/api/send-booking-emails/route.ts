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
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { applyPropertyToBookingClient } from '@/lib/client-properties'

export async function POST(request: Request) {
  try {
    // This route triggers a REAL email/SMS send to a client and/or team
    // member -- unlike the read-only dormant-override gaps found elsewhere
    // this session, this one had NO permission check at all, not even the
    // dormant-only kind. Any authenticated tenant member of any role could
    // fire an unwanted confirmation email/SMS to any client on the tenant.
    // Gated on bookings.edit, matching the tier every other booking-mutating
    // action in this codebase uses (e.g. jobs/[id]/route.ts's PATCH).
    const { tenant, error: authError } = await requirePermission('bookings.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { bookingId, clientOnly, channel = 'email' } = await request.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, end_time, service_type, price, clients(id, name, email, phone, address), client_properties(address, latitude, longitude), team_members!bookings_team_member_id_fkey(id, name, email, phone)')
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !booking) {
      if (error) console.error('send-booking-emails lookup error:', error)
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    applyPropertyToBookingClient(booking as never)

    const client = booking.clients as unknown as { id?: string; name?: string; email?: string; phone?: string; address?: string } | null
    const member = booking.team_members as unknown as { id?: string; name?: string; email?: string; phone?: string } | null
    const dateTime = booking.start_time ? new Date(booking.start_time).toLocaleString('en-US', {
      timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }) : ''

    const results: Array<Record<string, unknown>> = []

    if (client?.id) {
      const r = await notify({
        tenantId,
        type: 'booking_confirmed',
        title: 'Your booking is confirmed',
        message: dateTime,
        channel: channel === 'sms' ? 'sms' : 'email',
        recipientType: 'client',
        recipientId: client.id,
        bookingId,
        metadata: {
          clientName: client.name,
          serviceName: booking.service_type,
          dateTime,
          teamMemberName: member?.name,
          address: client?.address,
          price: booking.price ? `$${(booking.price / 100).toFixed(2)}` : undefined,
        },
      })
      results.push({ type: 'client_confirmation', ...r })
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
          address: client?.address,
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
