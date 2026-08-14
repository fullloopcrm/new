import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendClientSMS } from '@/lib/client-contacts'
import { getCommPrefs } from '@/lib/comms-prefs'
import { etHour, etToday, addCalendarDays, formatNaiveET } from '@/lib/recurring'
import type { BookingTomorrowConfirm } from '@/lib/types'
import { naiveToAnchoredDate } from '@/lib/naive-time'

export const maxDuration = 300 // Vercel pro plan

// Confirmation cron — runs every hour
// Clients: send day-before confirmation text asking for reply.
// Team members do NOT need to confirm — their portal schedule is the
// assignment, full stop. (Previously resent an hourly "reply YES to confirm"
// SMS per unconfirmed job, uncapped, to every cleaner — removed. That
// requirement never should have existed; a scheduled job in the portal is
// the assignment.)
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const now = new Date()
  const results: { type: string; tenant: string; recipient: string }[] = []
  let sent = 0
  let failed = 0
  const errors: string[] = []

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone, timezone')
    .eq('status', 'active')
    .limit(1000)

  for (const tenant of tenants || []) {
    if (!tenant.telnyx_api_key || !tenant.telnyx_phone) continue
    const tenantId = tenant.id
    // Client day-before confirmation is gated by the confirmation_reminder SMS toggle.
    const confirmPrefs = await getCommPrefs(tenantId)
    const clientConfirmOn = confirmPrefs.comms.confirmation_reminder?.sms !== false

    try {
      // ============================================
      // CLIENT DAY-BEFORE CONFIRMATION — 1pm ET the day before
      // ============================================
      // now.getHours() reads the SERVER's local hour (UTC on Vercel), so this
      // gate used to fire at 1pm UTC (9am EDT / 8am EST), not 1pm ET as
      // intended. etHour() reads the real ET wall-clock hour instead.
      if (etHour(now) === 13 && clientConfirmOn) {
        const tomorrowCal = addCalendarDays(etToday(), 1)
        const tomorrowStartBound = `${formatNaiveET(tomorrowCal)}Z`
        const tomorrowEndBound = `${formatNaiveET(tomorrowCal, 23, 59, 59)}Z`

        const { data: tomorrowBookings } = await supabaseAdmin
          .from('bookings')
          .select('id, client_id, start_time, service_type, clients(name, phone), team_members!bookings_team_member_id_fkey(name)')
          .eq('tenant_id', tenantId)
          .in('status', ['scheduled', 'confirmed'])
          .gte('start_time', tomorrowStartBound)
          .lte('start_time', tomorrowEndBound)
          .limit(500) // Don't process more than 500 per tenant per run
          .returns<BookingTomorrowConfirm[]>()

        for (const booking of tomorrowBookings || []) {
          const client = booking.clients
          if (!client || !booking.client_id) continue

          // Check if already sent confirmation for this booking
          const { data: alreadySent } = await supabaseAdmin
            .from('notifications')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('booking_id', booking.id)
            .eq('type', 'client_confirm_request')
            .limit(1)
          if (alreadySent && alreadySent.length > 0) continue

          const member = booking.team_members
          const time = naiveToAnchoredDate(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' , timeZone: 'UTC' })
          const memberFirst = member?.name?.split(' ')[0] || 'Your pro'
          const firstName = client.name?.split(' ')[0] || 'there'

          const smsBody = `${tenant.name}: Hi ${firstName}, just confirming your appointment tomorrow at ${time} with ${memberFirst}. Reply YES to confirm or call us to reschedule.\nReply STOP to opt out.`

          try {
            // Fans out to every contact on this client with receives_sms=true
            // (client_contacts), not just the single clients.phone value.
            const result = await sendClientSMS(tenant, booking.client_id, smsBody)
            sent += result.sent
            if (result.sent === 0) failed++
          } catch (smsErr) {
            failed++
            errors.push(`Client confirm SMS to ${client.name} (${tenantId}): ${smsErr instanceof Error ? smsErr.message : String(smsErr)}`)
          }

          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenantId,
            type: 'client_confirm_request',
            title: `Confirmation Request: ${client.name}`,
            message: `Day-before confirmation sent for tomorrow at ${time}`,
            booking_id: booking.id,
            channel: 'sms',
            recipient_type: 'client',
            recipient_id: booking.client_id,
            status: 'sent',
          })

          results.push({ type: 'client_confirm', tenant: tenant.name, recipient: client.name })
        }
      }
    } catch (tenantErr) {
      // Don't let one tenant's failure crash the whole cron
      failed++
      const errMsg = `Tenant ${tenant.name} (${tenantId}): ${tenantErr instanceof Error ? tenantErr.message : String(tenantErr)}`
      errors.push(errMsg)
      console.error('Cron confirmation error:', errMsg)
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    failed,
    errors: errors.slice(0, 20), // Cap error list to prevent huge responses
    results,
  })
}
