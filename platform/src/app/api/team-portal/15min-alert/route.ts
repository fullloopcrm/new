/**
 * 15-min payment alert — ported from nycmaid (2026-04-19), tenant-aware.
 *
 * Differences from the prior fullloop version:
 *   - 30-min idempotency window (don't re-fire if already sent <30 min ago)
 *   - Calculates from REAL check-in time when present (not just booked duration)
 *   - Sends a CLIENT pay-now SMS with a payment link
 *   - Triggers email-monitor immediately + again at 5 min to catch incoming Zelle
 *   - Opens admin_tasks row if both client SMS and email fail
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { notify } from '@/lib/notify'
import { parseTimestamp } from '@/lib/dates'

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, tenant_id, start_time, end_time, check_in_time, service_type, hourly_rate, pay_rate, fifteen_min_alert_time, payment_status, clients(id, name, phone, email), team_members(id, name, pay_rate, phone)')
      .eq('id', bookingId)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Idempotency — skip if alert was sent in the last 30 min
    if (booking.fifteen_min_alert_time) {
      const last = new Date(booking.fifteen_min_alert_time).getTime()
      if (Date.now() - last < 30 * 60 * 1000) {
        return NextResponse.json({ success: true, skipped: 'recent alert exists' })
      }
    }

    // Already paid — no point alerting
    if (booking.payment_status === 'paid') {
      return NextResponse.json({ success: true, skipped: 'already paid' })
    }

    const tenantId = booking.tenant_id
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, phone, owner_phone, telnyx_api_key, telnyx_phone, payment_methods, zelle_email')
      .eq('id', tenantId)
      .single()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    if (!tenant.telnyx_api_key || !tenant.telnyx_phone) {
      return NextResponse.json({ error: 'SMS not configured for tenant' }, { status: 400 })
    }

    // Real-time hours: use check_in_time if present
    const start = parseTimestamp(booking.start_time) || new Date(booking.start_time)
    const end = parseTimestamp(booking.end_time) || new Date(booking.end_time)
    const checkIn = booking.check_in_time ? new Date(booking.check_in_time) : null

    let estimatedHours: number
    if (checkIn) {
      const elapsedHours = (Date.now() - checkIn.getTime()) / (1000 * 60 * 60)
      estimatedHours = Math.max(0.5, Math.round(elapsedHours * 2) / 2)
    } else {
      const rawHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      estimatedHours = Math.max(0.5, Math.round(rawHours * 2) / 2)
    }

    const clientRate = booking.hourly_rate || 65
    const clientOwes = Math.round(estimatedHours * clientRate)

    const teamMember = booking.team_members as unknown as { id: string; name: string; pay_rate: number | null; phone: string | null } | null
    const cleanerRate = teamMember?.pay_rate || booking.pay_rate || 25
    const cleanerOwed = Math.round(estimatedHours * cleanerRate)

    const client = booking.clients as unknown as { id: string; name: string; phone: string | null; email: string | null } | null
    const clientName = client?.name || 'Client'
    const cleanerName = teamMember?.name || 'Unassigned'

    // Record alert timestamp BEFORE sending so concurrent retries see it
    await supabaseAdmin
      .from('bookings')
      .update({ fifteen_min_alert_time: new Date().toISOString() })
      .eq('id', bookingId)

    let clientSmsSent = false
    let adminSmsSent = false

    // 1. CLIENT pay-now SMS
    if (client?.phone) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || ''
      const payLink = baseUrl ? `${baseUrl}/pay/${bookingId}` : ''
      const methods = (tenant.payment_methods || ['card']).join(', ')
      const zelleLine = tenant.zelle_email ? `\nZelle: ${tenant.zelle_email}` : ''
      const linkLine = payLink ? `\nPay: ${payLink}` : ''

      const clientMsg = `Hi ${clientName.split(' ')[0]} — your service is ~15 min from complete. Total: $${clientOwes} (${estimatedHours} hrs @ $${clientRate}/hr).\nMethods: ${methods}${zelleLine}${linkLine}\nWe bill in 30-min increments. 😊 — ${tenant.name || ''}`

      try {
        await sendSMS({
          to: client.phone,
          body: clientMsg,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        })
        clientSmsSent = true
      } catch (err) {
        console.error('[15min] client SMS failed:', err)
      }
    }

    // 2. ADMIN heads-up SMS (bilingual)
    const adminPhone = tenant.owner_phone || tenant.phone
    if (adminPhone) {
      const adminMsg = `15-MIN HEADS UP / AVISO DE 15 MIN\n${clientName} — ${booking.service_type || 'Service'}\nPro: ${cleanerName}\nClient owes: $${clientOwes} (${estimatedHours}h × $${clientRate})\nPro pay: $${cleanerOwed} (${estimatedHours}h × $${cleanerRate})`
      try {
        await sendSMS({
          to: adminPhone.startsWith('+') ? adminPhone : `+1${adminPhone}`,
          body: adminMsg,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        })
        adminSmsSent = true
      } catch (err) {
        console.error('[15min] admin SMS failed:', err)
      }
    }

    // 3. In-app notification
    await notify({
      tenantId,
      type: 'booking_reminder' as never,
      title: '15-Min Heads Up',
      message: `${clientName} — ${booking.service_type || 'service'} — $${clientOwes} due`,
      bookingId,
    }).catch(() => {})

    // 4. If client SMS failed AND we have admin contact, open a high-priority task
    if (!clientSmsSent && client?.phone) {
      await supabaseAdmin.from('admin_tasks').insert({
        tenant_id: tenantId,
        type: 'payment_alert_failed',
        priority: 'high',
        title: `Couldn't reach ${clientName} for payment`,
        description: `15-min alert SMS failed for booking ${bookingId}. Reach out manually.`,
        related_type: 'booking',
        related_id: bookingId,
      })
    }

    // 5. Trigger email monitor immediately + again in 5 min to catch incoming Zelle
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}`
    if (baseUrl && process.env.CRON_SECRET) {
      fetch(`${baseUrl}/api/email/monitor`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
      }).catch(() => {})
      setTimeout(() => {
        fetch(`${baseUrl}/api/email/monitor`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
        }).catch(() => {})
      }, 5 * 60 * 1000)
    }

    return NextResponse.json({
      success: true,
      clientSmsSent,
      adminSmsSent,
      clientOwes,
      cleanerOwed,
      estimatedHours,
    })
  } catch (err) {
    console.error('[15min-alert]', err)
    return NextResponse.json({ error: 'Failed to send alert' }, { status: 500 })
  }
}
