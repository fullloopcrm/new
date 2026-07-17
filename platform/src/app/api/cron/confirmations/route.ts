import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { getCommPrefs } from '@/lib/comms-prefs'
import type { BookingUnconfirmed, BookingTomorrowConfirm } from '@/lib/types'
import { nowNaiveET, etHour, etToday, addCalendarDays, formatNaiveET } from '@/lib/recurring'

export const maxDuration = 300 // Vercel pro plan

// Confirmation cron — runs every hour
// 1. Team members: resend job confirmation SMS every hour until confirmed
// 2. Clients: send day-before confirmation text asking for reply
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
    .select('id, name, telnyx_api_key, telnyx_phone')
    .eq('status', 'active')
    .limit(1000)

  for (const tenant of tenants || []) {
    if (!tenant.telnyx_api_key || !tenant.telnyx_phone) continue
    const tenantId = tenant.id
    // Client day-before confirmation is gated by the confirmation_reminder SMS
    // toggle. Team confirm-requests are operational and stay ungated.
    const confirmPrefs = await getCommPrefs(tenantId)
    const clientConfirmOn = confirmPrefs.comms.confirmation_reminder?.sms !== false

    try {
      // ============================================
      // TEAM MEMBER CONFIRMATION — Resend hourly until confirmed
      // For jobs in the next 48 hours with no team confirmation
      // ============================================
      // start_time is naive-ET; a true-UTC "now"/"+48h" here would skew both
      // edges of this window by 4-5h (see lib/recurring's nowNaiveET header).
      const { data: unconfirmedJobs } = await supabaseAdmin
        .from('bookings')
        .select('id, start_time, end_time, team_member_id, clients(name, address), team_members!bookings_team_member_id_fkey(name, phone)')
        .eq('tenant_id', tenantId)
        .in('status', ['scheduled'])
        .not('team_member_id', 'is', null)
        .gte('start_time', nowNaiveET())
        .lte('start_time', nowNaiveET(48 * 60 * 60 * 1000))
        .limit(500) // Don't process more than 500 per tenant per run
        .returns<BookingUnconfirmed[]>()

      for (const booking of unconfirmedJobs || []) {
        const member = booking.team_members
        if (!member?.phone) continue

        // Check if team member already confirmed this job
        const { data: confirmed } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('booking_id', booking.id)
          .eq('type', 'team_confirmed')
          .limit(1)
        if (confirmed && confirmed.length > 0) continue

        // Check when we last sent a confirmation request for this booking
        const { data: lastSent } = await supabaseAdmin
          .from('notifications')
          .select('created_at')
          .eq('tenant_id', tenantId)
          .eq('booking_id', booking.id)
          .eq('type', 'team_confirm_request')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Only send once per hour (skip if sent within last 55 min)
        if (lastSent) {
          const lastSentTime = new Date(lastSent.created_at).getTime()
          if (now.getTime() - lastSentTime < 55 * 60 * 1000) continue
        }

        const client = booking.clients
        const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        const memberFirst = member.name.split(' ')[0]

        const smsBody = `${tenant.name}: Hi ${memberFirst}, please confirm your job on ${date} at ${time} — ${client?.name || 'Client'}${client?.address ? ` @ ${client.address}` : ''}. Reply YES to confirm.`

        try {
          await sendSMS({
            to: member.phone,
            body: smsBody,
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          })
          sent++
        } catch (smsErr) {
          failed++
          errors.push(`Team confirm SMS to ${member.name} (${tenantId}): ${smsErr instanceof Error ? smsErr.message : String(smsErr)}`)
        }

        // Log the request for dedup + tracking
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'team_confirm_request',
          title: `Confirmation Request: ${member.name}`,
          message: `Sent to ${member.name} for ${client?.name || 'client'} on ${date}`,
          booking_id: booking.id,
          channel: 'sms',
          recipient_type: 'team_member',
          recipient_id: booking.team_member_id,
          status: 'sent',
        })

        // Admin notification if this is the 3rd+ attempt (been 3+ hours without confirmation)
        const { count: attemptCount } = await supabaseAdmin
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('booking_id', booking.id)
          .eq('type', 'team_confirm_request')

        if ((attemptCount || 0) >= 3) {
          // Only alert admin once per day about this booking
          const { data: adminAlerted } = await supabaseAdmin
            .from('notifications')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('booking_id', booking.id)
            .eq('type', 'team_no_confirm_alert')
            .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1)

          if (!adminAlerted || adminAlerted.length === 0) {
            await supabaseAdmin.from('notifications').insert({
              tenant_id: tenantId,
              type: 'team_no_confirm_alert',
              title: `No Confirmation: ${member.name}`,
              message: `${member.name} has not confirmed their ${date} job for ${client?.name || 'client'} after ${attemptCount} attempts.`,
              booking_id: booking.id,
              channel: 'in_app',
              status: 'sent',
            })
          }
        }

        results.push({ type: 'team_confirm', tenant: tenant.name, recipient: member.name })
      }

      // ============================================
      // CLIENT DAY-BEFORE CONFIRMATION — 1pm ET the day before
      // ============================================
      // now.getHours() reads the SERVER's local hour (UTC on Vercel), not
      // ET -- this gate was firing at 1pm UTC (8-9am ET) instead of 1pm ET.
      // See recurring.ts's etHour() header. start_time is naive-ET, so the
      // window itself must also be built in the ET calendar, not the old
      // UTC-based tomorrowStart/tomorrowEnd -- same day-boundary bug already
      // fixed on the main dashboard (975d7db8).
      if (etHour(now) === 13 && clientConfirmOn) {
        const tomorrowStartET = formatNaiveET(addCalendarDays(etToday(), 1))
        const tomorrowEndET = formatNaiveET(addCalendarDays(etToday(), 1), 23, 59, 59)

        const { data: tomorrowBookings } = await supabaseAdmin
          .from('bookings')
          .select('id, client_id, start_time, service_type, clients(name, phone), team_members!bookings_team_member_id_fkey(name)')
          .eq('tenant_id', tenantId)
          .in('status', ['scheduled', 'confirmed'])
          .gte('start_time', tomorrowStartET)
          .lte('start_time', tomorrowEndET)
          .limit(500) // Don't process more than 500 per tenant per run
          .returns<BookingTomorrowConfirm[]>()

        for (const booking of tomorrowBookings || []) {
          const client = booking.clients
          if (!client?.phone) continue

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
          const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          const memberFirst = member?.name?.split(' ')[0] || 'Your pro'
          const firstName = client.name?.split(' ')[0] || 'there'

          const smsBody = `${tenant.name}: Hi ${firstName}, just confirming your appointment tomorrow at ${time} with ${memberFirst}. Reply YES to confirm or call us to reschedule.\nReply STOP to opt out.`

          try {
            await sendSMS({
              to: client.phone,
              body: smsBody,
              telnyxApiKey: tenant.telnyx_api_key,
              telnyxPhone: tenant.telnyx_phone,
            })
            sent++
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
