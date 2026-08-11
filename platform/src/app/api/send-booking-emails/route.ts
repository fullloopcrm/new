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
import { applyPropertyToBookingClient } from '@/lib/client-properties'
import { nycmaidWallClockTime } from '@/lib/time-window'

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
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
    // start_time is a naive wall-clock string (already the correct local
    // time, no timezone attached). Parsing it with `new Date(...)` on
    // Vercel's UTC-default runtime and then re-converting with
    // `timeZone: 'America/New_York'` double-converts it, shifting the
    // displayed time back by the ET offset (e.g. 9:00 AM -> 5:00 AM,
    // live incident 2026-08-11 / Tevin Adelman booking). Same fix already
    // applied in lib/time-window.ts (fl-confirm-email-investigate-2026-07-23)
    // — extract the wall-clock components directly, no Date/Intl tz round-trip.
    const dateTime = booking.start_time ? (() => {
      const [datePart] = booking.start_time.replace(' ', 'T').split('T')
      const [y, m, d] = datePart.split('-').map(Number)
      const dateStr = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      return `${dateStr}, ${nycmaidWallClockTime(booking.start_time)}`
    })() : ''

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
