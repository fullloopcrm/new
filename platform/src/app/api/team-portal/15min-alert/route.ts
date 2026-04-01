import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { notify } from '@/lib/notify'
import { parseTimestamp } from '@/lib/dates'

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

    // Get booking with tenant context
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, tenant_id, start_time, end_time, service_type, hourly_rate, pay_rate, clients(name), team_members(name, pay_rate)')
      .eq('id', bookingId)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const tenantId = booking.tenant_id

    // Get tenant settings for admin phone + SMS credentials
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, phone, owner_phone, telnyx_api_key, telnyx_phone')
      .eq('id', tenantId)
      .single()

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const adminPhone = tenant.owner_phone || tenant.phone
    if (!adminPhone) return NextResponse.json({ error: 'No admin phone configured' }, { status: 400 })
    if (!tenant.telnyx_api_key || !tenant.telnyx_phone) {
      return NextResponse.json({ error: 'SMS not configured for tenant' }, { status: 400 })
    }

    // Calculate from booked duration (start_time -> end_time)
    const start = parseTimestamp(booking.start_time) || new Date(booking.start_time)
    const end = parseTimestamp(booking.end_time) || new Date(booking.end_time)
    const rawHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    const estimatedHours = Math.max(0.5, Math.round(rawHours * 2) / 2)

    const clientRate = booking.hourly_rate || 65
    const clientOwes = Math.round(estimatedHours * clientRate)

    const teamMember = booking.team_members as unknown as { name: string; pay_rate: number | null } | null
    const cleanerRate = teamMember?.pay_rate || booking.pay_rate || 25
    const cleanerOwed = Math.round(estimatedHours * cleanerRate)

    const clientName = (booking.clients as unknown as { name: string })?.name || 'Client'
    const cleanerName = teamMember?.name || 'Unassigned'
    const serviceLabel = booking.service_type === 'regular' ? 'Standard'
      : booking.service_type === 'deep' ? 'Deep'
      : booking.service_type === 'move_in_out' ? 'Move-in/out'
      : booking.service_type || 'Cleaning'

    const smsMessage = `15-MIN HEADS UP / AVISO DE 15 MIN\n${clientName} — ${serviceLabel}\nCleaner / Limpiador(a): ${cleanerName}\nClient owes / Cliente debe: $${clientOwes} (${estimatedHours}hrs @ $${clientRate}/hr)\nCleaner owed / Pago limpiador(a): $${cleanerOwed} (${estimatedHours}hrs @ $${cleanerRate}/hr)\nCollect payment now. / Cobrar pago ahora.`

    // Record the 15-min alert timestamp on the booking
    await supabaseAdmin
      .from('bookings')
      .update({ fifteen_min_alert_time: new Date().toISOString() })
      .eq('id', bookingId)

    // Send SMS to admin
    let smsSent = false
    try {
      await sendSMS({
        to: adminPhone.startsWith('+') ? adminPhone : `+1${adminPhone}`,
        body: smsMessage,
        telnyxApiKey: tenant.telnyx_api_key,
        telnyxPhone: tenant.telnyx_phone,
      })
      smsSent = true
    } catch (err) {
      console.error('15min SMS failed:', err)
    }

    // Also send admin notification
    await notify({
      tenantId,
      type: 'booking_reminder',
      title: '15-Min Heads Up',
      message: smsMessage,
      bookingId,
    }).catch(() => {})

    return NextResponse.json({ success: true, smsSent })
  } catch (err) {
    console.error('15min-alert error:', err)
    return NextResponse.json({ error: 'Failed to send alert' }, { status: 500 })
  }
}
