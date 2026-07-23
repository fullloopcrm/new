import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { getCommPrefs } from '@/lib/comms-prefs'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { sendSMS } from '@/lib/sms'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { sendPushToClient } from '@/lib/push'
import { getTenantTimezone, getLocalHour, getTenantDayBoundaries, getTenantNaiveDayBoundaries, addCalendarDays, formatCalendarNaive, toTenantNaiveString } from '@/lib/tenant-time'
import type {
  BookingWithClientAndTeam,
  BookingWith2HourReminder,
  BookingWithPaymentAlert,
  BookingWithThankYou,
  BookingPending,
} from '@/lib/types'

export const maxDuration = 300 // Vercel pro plan

// Comprehensive reminder cron — runs hourly
// Handles: day-based reminders, hour-based reminders, payment alerts,
// thank-you emails, unpaid team alerts, pending booking alerts
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const now = new Date()
  const results: { type: string; booking_id: string; tenant_id: string }[] = []
  let sent = 0
  let failed = 0
  const errors: string[] = []

  // Get all active tenants
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone, resend_api_key, timezone')
    .eq('status', 'active')
    .limit(1000)

  for (const tenant of tenants || []) {
    const tenantId = tenant.id
    const timezone = getTenantTimezone(tenant)
    const localHour = getLocalHour(timezone, now)
    const clientSms = await clientSmsTemplatesFor(tenantId)
    // Per-tenant communications prefs (loaded once — not per booking).
    // reminder_days drives which day-out reminders fire; the booking_reminder
    // SMS toggle gates the client text. Email is gated centrally in notify().
    const commPrefs = await getCommPrefs(tenantId)
    const reminderDays = commPrefs.timing.reminder_days.length ? commPrefs.timing.reminder_days : [3, 1]
    const reminderHoursBefore = commPrefs.timing.reminder_hours_before.length ? commPrefs.timing.reminder_hours_before : [2]
    const reminderSmsOn = commPrefs.comms.booking_reminder?.sms !== false

    try {
      // ============================================
      // DAY-BASED REMINDERS — send at 8am tenant-local time
      // 3 days before + 1 day before
      // ============================================
      if (localHour === 8) {
        const { today: todayCal } = getTenantNaiveDayBoundaries(timezone, now)
        for (const daysOut of reminderDays) {
          const targetCal = addCalendarDays(todayCal, daysOut)
          const targetNaive = formatCalendarNaive(targetCal)
          const targetEndNaive = formatCalendarNaive(targetCal, 23, 59, 59)
          const label = daysOut === 1 ? 'tomorrow' : `in ${daysOut} days`
          const emailType = `reminder_${daysOut}day`

          const { data: bookings } = await supabaseAdmin
            .from('bookings')
            .select('id, client_id, team_member_id, service_type, start_time, end_time, clients(name, phone, email), team_members!bookings_team_member_id_fkey(name, phone, email)')
            .eq('tenant_id', tenantId)
            .in('status', ['scheduled', 'confirmed'])
            .gte('start_time', targetNaive)
            .lte('start_time', targetEndNaive)
            .limit(500)
            .returns<BookingWithClientAndTeam[]>()

          for (const booking of bookings || []) {
            // Deduplication
            const { data: existing } = await supabaseAdmin
              .from('notifications')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('booking_id', booking.id)
              .eq('type', emailType)
              .limit(1)
            if (existing && existing.length > 0) continue

            const client = booking.clients
            const clientName = client?.name?.split(' ')[0] || 'there'

            // Client email reminder — nycmaid gets the rich branded template
            // (What to expect / Payment / Prep tips); other tenants keep the
            // plain generic notify() email. The notifications row is still
            // written either way since the dedup check above keys off it.
            if (client?.email) {
              if (isNycMaid(tenantId) && booking.client_id) {
                const { clientReminderEmail } = await import('@/lib/nycmaid/email-templates')
                const { sendClientEmail } = await import('@/lib/nycmaid/client-contacts')
                const email = clientReminderEmail(booking, label)
                await sendClientEmail(booking.client_id, email.subject, email.html).catch(() => {})
                await supabaseAdmin.from('notifications').insert({
                  tenant_id: tenantId,
                  type: emailType,
                  title: email.subject,
                  message: `Reminder email sent to ${client.email}`,
                  channel: 'email',
                  recipient_type: 'client',
                  recipient_id: booking.client_id,
                  booking_id: booking.id,
                  status: 'sent',
                  metadata: { clientName: client?.name, timeUntil: label, dedup: emailType },
                }).then(() => {}, () => {})
              } else {
                await notify({
                  tenantId,
                  type: 'booking_reminder',
                  title: `Reminder: Appointment ${label}`,
                  message: `Hi ${clientName}, your ${booking.service_type || 'appointment'} is ${label} on ${new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`,
                  channel: 'email',
                  recipientType: 'client',
                  recipientId: booking.client_id ?? undefined,
                  bookingId: booking.id,
                  metadata: { clientName: client?.name, timeUntil: label, dedup: emailType },
                })
              }
            }

            // Client SMS reminder (gated by the booking_reminder SMS toggle)
            if (reminderSmsOn && client?.phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
              const smsData = { start_time: booking.start_time, team_members: booking.team_members }
              const smsBody = clientSms.reminder(smsData, label)
              try {
                await sendSMS({ to: client.phone, body: smsBody, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone })
                sent++
              } catch (smsErr) {
                failed++
                errors.push(`SMS to ${client.phone} for booking ${booking.id}: ${smsErr instanceof Error ? smsErr.message : String(smsErr)}`)
              }
            }

            // NYC Maid parity: web-push the client alongside the reminder.
            if (isNycMaid(tenantId) && booking.client_id) {
              sendPushToClient(booking.client_id, daysOut === 1 ? 'Cleaning Tomorrow' : `Cleaning ${label}`, `Your cleaning is ${label}`, '/book/dashboard').catch(() => {})
            }

            // Team member reminder (day before only)
            if (daysOut === 1 && booking.team_member_id) {
              const member = booking.team_members
              if (member) {
                let teamMsg = `${client?.name || 'Client'} - ${label} at ${new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`

                // NYC Maid parity: send the cleaner their FULL next-day route with
                // travel times (property-aware coords). Only the earliest job of the
                // day sends it, so a multi-job cleaner gets one route text, not N.
                if (isNycMaid(tenantId)) {
                  const { calculateDistance, estimateTransitMinutes, geocodeAddress } = await import('@/lib/nycmaid/geo')
                  const dateStr = booking.start_time.split('T')[0]
                  const { data: dayJobs } = await supabaseAdmin
                    .from('bookings')
                    .select('id, start_time, clients(name, address, latitude, longitude), client_properties(address, latitude, longitude)')
                    .eq('tenant_id', tenantId).eq('team_member_id', booking.team_member_id)
                    .gte('start_time', `${dateStr}T00:00:00`).lte('start_time', `${dateStr}T23:59:59`)
                    .not('status', 'in', '("cancelled")').order('start_time', { ascending: true })
                  const jobs = dayJobs || []
                  if (jobs.length && jobs[0].id === booking.id) {
                    const { data: tm } = await supabaseAdmin.from('team_members').select('has_car').eq('id', booking.team_member_id).single()
                    const hasCar = Boolean(tm?.has_car)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const coordsOf = async (j: any): Promise<{ lat: number; lng: number } | null> => {
                      const cp = j.client_properties, c = j.clients
                      const src = (cp?.latitude != null && cp?.longitude != null) ? cp : (c?.latitude != null && c?.longitude != null) ? c : null
                      if (src) return { lat: Number(src.latitude), lng: Number(src.longitude) }
                      const addr = cp?.address || c?.address
                      if (addr) { const co = await geocodeAddress(addr).catch(() => null); if (co) return co }
                      return null
                    }
                    const lines: string[] = []
                    for (let i = 0; i < jobs.length; i++) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const j = jobs[i] as any
                      const t = new Date(j.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      lines.push(`${t} ${j.clients?.name?.split(' ')[0] || 'Client'}`)
                      if (i < jobs.length - 1) {
                        const a = await coordsOf(j); const b = await coordsOf(jobs[i + 1])
                        if (a && b) { const mins = estimateTransitMinutes(calculateDistance(a.lat, a.lng, b.lat, b.lng), hasCar); lines.push(`  ${hasCar ? '🚗' : '🚇'} ~${mins} min`) }
                      }
                    }
                    teamMsg = `Tomorrow's schedule:\n${lines.join('\n')}`
                  } else if (jobs.length) {
                    // A later job — the earliest already sent the full route; skip.
                    teamMsg = ''
                  }
                }

                if (teamMsg) {
                  await notify({
                    tenantId,
                    type: 'booking_reminder',
                    title: 'Job Tomorrow',
                    message: teamMsg,
                    channel: 'sms',
                    recipientType: 'team_member',
                    recipientId: booking.team_member_id,
                    bookingId: booking.id,
                  })
                }
              }
            }

            results.push({ type: emailType, booking_id: booking.id, tenant_id: tenantId })
            sent++
          }
        }
      }

      // ============================================
      // HOUR-BASED REMINDERS — one pass per configured hours-before (default [2])
      // ============================================
      for (const hoursBefore of reminderHoursBefore) {
      // start_time is naive tenant-local — snap the target instant to its
      // tenant-local hour window, not the server's (UTC) hour window.
      const targetInstant = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000)
      const targetHourPrefix = toTenantNaiveString(timezone, targetInstant).slice(0, 13) // 'YYYY-MM-DDTHH'
      const hourWindowStartNaive = `${targetHourPrefix}:00:00`
      const hourWindowEndNaive = `${targetHourPrefix}:59:59`

      const { data: hourBookings } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id, team_member_id, service_type, start_time, clients(name, phone, email), team_members!bookings_team_member_id_fkey(name, phone)')
        .eq('tenant_id', tenantId)
        .in('status', ['scheduled', 'confirmed'])
        .gte('start_time', hourWindowStartNaive)
        .lte('start_time', hourWindowEndNaive)
        .limit(500)
        .returns<BookingWith2HourReminder[]>()

      for (const booking of hourBookings || []) {
        const emailType = `reminder_${hoursBefore}hour`
        const { data: existing } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('booking_id', booking.id)
          .eq('type', emailType)
          .limit(1)
        if (existing && existing.length > 0) continue

        const client = booking.clients
        const member = booking.team_members
        const memberFirst = member?.name?.split(' ')[0] || 'Your pro'

        // Client SMS — 2hr reminder (gated by the booking_reminder SMS toggle)
        if (reminderSmsOn && client?.phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
          const smsBody = `${tenant.name}: Reminder — ${memberFirst} arrives at ${new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. Almost time!\nReply STOP to opt out.`
          try {
            await sendSMS({ to: client.phone, body: smsBody, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone })
            sent++
          } catch (smsErr) {
            failed++
            errors.push(`2hr SMS to client ${booking.client_id}: ${smsErr instanceof Error ? smsErr.message : String(smsErr)}`)
          }
        }

        // Team member SMS — 2hr reminder
        if (booking.team_member_id && member?.phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
          const smsBody = `${tenant.name}: Job in ${hoursBefore} hour${hoursBefore === 1 ? '' : 's'} — ${client?.name || 'Client'} at ${new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
          try {
            await sendSMS({ to: member.phone, body: smsBody, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone })
            sent++
          } catch (smsErr) {
            failed++
            errors.push(`2hr SMS to team ${booking.team_member_id}: ${smsErr instanceof Error ? smsErr.message : String(smsErr)}`)
          }
        }

        // NYC Maid parity: web-push the client for the 2-hour reminder.
        if (isNycMaid(tenantId) && booking.client_id) {
          sendPushToClient(booking.client_id, `Cleaning in ${hoursBefore} hour${hoursBefore === 1 ? '' : 's'}`, 'Your cleaner arrives soon', '/book/dashboard').catch(() => {})
        }

        // Log as notification for dedup
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: emailType,
          title: 'Reminder: 2 hours',
          message: `Sent to ${client?.name || 'client'}`,
          booking_id: booking.id,
          channel: 'sms',
          recipient_type: 'client',
          recipient_id: booking.client_id,
          status: 'sent',
        })

        results.push({ type: emailType, booking_id: booking.id, tenant_id: tenantId })
      }
      } // end hours-before loop

      // ============================================
      // PAYMENT ALERT — 15 min before booking end_time
      // ============================================
      // end_time is naive tenant-local — convert the real-instant window to
      // that convention before comparing.
      const payWindowStartNaive = toTenantNaiveString(timezone, new Date(now.getTime() + 10 * 60 * 1000))
      const payWindowEndNaive = toTenantNaiveString(timezone, new Date(now.getTime() + 20 * 60 * 1000))

      const { data: endingSoon } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id, start_time, end_time, hourly_rate, clients(name), team_members!bookings_team_member_id_fkey(name)')
        .eq('tenant_id', tenantId)
        .eq('status', 'in_progress')
        .gte('end_time', payWindowStartNaive)
        .lte('end_time', payWindowEndNaive)
        .limit(500)
        .returns<BookingWithPaymentAlert[]>()

      for (const booking of endingSoon || []) {
        const { data: existing } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('booking_id', booking.id)
          .eq('type', 'payment_due')
          .limit(1)
        if (existing && existing.length > 0) continue

        const durationMs = new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()
        const hours = durationMs / (1000 * 60 * 60)
        const rate = booking.hourly_rate || 75
        const amount = (hours * rate).toFixed(0)
        const clientName = booking.clients?.name || 'Client'
        const memberName = booking.team_members?.name || 'Team member'

        await notify({
          tenantId,
          type: 'payment_received' as const,
          title: 'Payment Due Soon',
          message: `${clientName} — $${amount} due in 15 min (${memberName})`,
          channel: 'email',
          recipientType: 'admin',
          metadata: { dedup: 'payment_due' },
        })

        // Also create in-app notification
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'payment_due',
          title: 'Payment Due Soon',
          message: `${clientName} — $${amount} due in 15 min (${memberName})`,
          booking_id: booking.id,
          channel: 'in_app',
          status: 'sent',
        })

        results.push({ type: 'payment_due', booking_id: booking.id, tenant_id: tenantId })
        sent++
      }

      // ============================================
      // THANK YOU EMAIL — 3 days after first booking (8am tenant-local only)
      // ============================================
      if (localHour === 8) {
        const { today: todayCal } = getTenantNaiveDayBoundaries(timezone, now)
        const threeDaysAgoCal = addCalendarDays(todayCal, -3)
        const threeDaysAgoNaive = formatCalendarNaive(threeDaysAgoCal)
        const threeDaysAgoEndNaive = formatCalendarNaive(threeDaysAgoCal, 23, 59, 59)

        const { data: completedBookings } = await supabaseAdmin
          .from('bookings')
          .select('id, client_id, service_type, clients(name, email)')
          .eq('tenant_id', tenantId)
          .in('status', ['completed', 'paid'])
          .gte('end_time', threeDaysAgoNaive)
          .lte('end_time', threeDaysAgoEndNaive)
          .limit(500) // Don't process more than 500 per tenant per run
          .returns<BookingWithThankYou[]>()

        for (const booking of completedBookings || []) {
          const client = booking.clients
          if (!client?.email || !booking.client_id) continue

          // Check if thank-you already sent to this client (in last year)
          const oneYearAgo = new Date(now)
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
          const { data: alreadySent } = await supabaseAdmin
            .from('notifications')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('type', 'follow_up')
            .eq('recipient_id', booking.client_id)
            .gte('created_at', oneYearAgo.toISOString())
            .limit(1)
          if (alreadySent && alreadySent.length > 0) continue

          // Check this was their first booking
          const { count } = await supabaseAdmin
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('client_id', booking.client_id)
            .in('status', ['completed', 'paid'])
            .lt('end_time', threeDaysAgoNaive)

          if ((count || 0) === 0) {
            if (isNycMaid(tenantId)) {
              const { clientThankYouEmail } = await import('@/lib/nycmaid/email-templates')
              const { sendClientEmail } = await import('@/lib/nycmaid/client-contacts')
              const email = clientThankYouEmail(client.name || '')
              await sendClientEmail(booking.client_id, email.subject, email.html).catch(() => {})
              await supabaseAdmin.from('notifications').insert({
                tenant_id: tenantId,
                type: 'follow_up',
                title: email.subject,
                message: `Thank-you email sent to ${client.email}`,
                channel: 'email',
                recipient_type: 'client',
                recipient_id: booking.client_id,
                booking_id: booking.id,
                status: 'sent',
                metadata: { clientName: client.name, serviceName: booking.service_type },
              }).then(() => {}, () => {})
            } else {
              await notify({
                tenantId,
                type: 'follow_up',
                title: `Thank you from ${tenant.name}!`,
                message: `Hi ${client.name?.split(' ')[0] || 'there'}, thank you for choosing ${tenant.name}! We hope you enjoyed your ${booking.service_type || 'service'}. Book again and mention THANKYOU for 10% off.`,
                channel: 'email',
                recipientType: 'client',
                recipientId: booking.client_id,
                bookingId: booking.id,
                metadata: { clientName: client.name, serviceName: booking.service_type, discountCode: 'THANKYOU' },
              })
            }
            results.push({ type: 'thank_you', booking_id: booking.id, tenant_id: tenantId })
            sent++
          }
        }
      }

      // ============================================
      // UNPAID TEAM ALERTS — 8am tenant-local, completed 2+ days ago with unpaid team
      // ============================================
      if (localHour === 8) {
        const twoDaysAgoNaive = toTenantNaiveString(timezone, new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000))

        const { data: unpaidBookings } = await supabaseAdmin
          .from('bookings')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('status', 'completed')
          .lt('end_time', twoDaysAgoNaive)
          .or('team_member_paid.is.null,team_member_paid.eq.false')
          .limit(500) // Don't process more than 500 per tenant per run

        if (unpaidBookings && unpaidBookings.length > 0) {
          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenantId,
            type: 'unpaid_team',
            title: 'Unpaid Team',
            message: `${unpaidBookings.length} completed job${unpaidBookings.length !== 1 ? 's' : ''} with unpaid team`,
            channel: 'in_app',
            status: 'sent',
          })
          results.push({ type: 'unpaid_team', booking_id: 'admin', tenant_id: tenantId })
          sent++
        }
      }

      // ============================================
      // PENDING BOOKING ALERTS — 8am and 2pm tenant-local, unassigned bookings
      // ============================================
      if (localHour === 8 || localHour === 14) {
        const { data: pendingBookings } = await supabaseAdmin
          .from('bookings')
          .select('id, start_time, clients(name)')
          .eq('tenant_id', tenantId)
          .in('status', ['pending', 'scheduled'])
          .is('team_member_id', null)
          .order('start_time', { ascending: true })
          .limit(500) // Don't process more than 500 per tenant per run
          .returns<BookingPending[]>()

        if (pendingBookings && pendingBookings.length > 0) {
          const details = pendingBookings.slice(0, 5).map(b => {
            const clientName = b.clients?.name || 'Unknown'
            const date = new Date(b.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            return `${clientName} - ${date}`
          }).join(', ')

          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenantId,
            type: 'pending_reminder',
            title: 'Unassigned Bookings',
            message: `${pendingBookings.length} booking${pendingBookings.length !== 1 ? 's' : ''} need team assignment: ${details}`,
            channel: 'in_app',
            status: 'sent',
          })

          // Also send admin email
          await notify({
            tenantId,
            type: 'pending_reminder',
            title: `${pendingBookings.length} Unassigned Booking${pendingBookings.length !== 1 ? 's' : ''}`,
            message: `${pendingBookings.length} booking${pendingBookings.length !== 1 ? 's' : ''} still need team assignment. Review and assign in the dashboard.`,
            channel: 'email',
            recipientType: 'admin',
          })

          results.push({ type: 'pending_reminder', booking_id: 'admin', tenant_id: tenantId })
          sent++
        }
      }
      // ============================================
      // 8PM DAILY OPS RECAP — today's jobs + financials + tomorrow preview (tenant-local)
      // ============================================
      if (localHour === 20) {
        const { todayStartNaive, todayEndNaive, tomorrowStartNaive, tomorrowEndNaive, today: todayCal, tomorrow: tomorrowCal } = getTenantNaiveDayBoundaries(timezone, now)

        const { data: todayBookings } = await supabaseAdmin
          .from('bookings')
          .select('id, start_time, end_time, price, payment_status, service_type, clients(name), team_members!bookings_team_member_id_fkey(name)')
          .eq('tenant_id', tenantId)
          .gte('start_time', todayStartNaive)
          .lte('start_time', todayEndNaive)
          .neq('status', 'cancelled')
          .order('start_time')
          .limit(500)

        const { data: tomorrowBookings } = await supabaseAdmin
          .from('bookings')
          .select('id, start_time, end_time, price, service_type, clients(name), team_members!bookings_team_member_id_fkey(name)')
          .eq('tenant_id', tenantId)
          .gte('start_time', tomorrowStartNaive)
          .lte('start_time', tomorrowEndNaive)
          .in('status', ['scheduled', 'confirmed'])
          .order('start_time')
          .limit(500)

        const fmt = (cents: number) => '$' + (cents / 100).toFixed(0)
        const todayRevenue = (todayBookings || []).reduce((s: number, b: { price?: number }) => s + (b.price || 0), 0)
        const todayPaid = (todayBookings || []).filter((b: { payment_status?: string }) => b.payment_status === 'paid').length
        const todayUnpaid = (todayBookings || []).length - todayPaid

        const todayDateStr = new Date(Date.UTC(todayCal.year, todayCal.month, todayCal.day)).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
        const tomorrowDateStr = new Date(Date.UTC(tomorrowCal.year, tomorrowCal.month, tomorrowCal.day)).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })

        const todayJobsList = (todayBookings || []).map((b: any) => ({
          clientName: b.clients?.name || 'Unknown',
          teamMemberName: b.team_members?.name || 'Unassigned',
          time: `${new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${new Date(b.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
          revenue: fmt(b.price || 0),
          paymentStatus: b.payment_status || 'pending',
        }))

        const tomorrowJobsList = (tomorrowBookings || []).map((b: any) => ({
          clientName: b.clients?.name || 'Unknown',
          teamMemberName: b.team_members?.name || 'Unassigned',
          time: `${new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${new Date(b.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
          revenue: fmt(b.price || 0),
        }))

        await notify({
          tenantId,
          type: 'daily_ops_recap',
          title: `Daily Ops Recap — ${todayDateStr}`,
          message: `Today: ${todayJobsList.length} jobs, ${fmt(todayRevenue)} revenue · Tomorrow: ${tomorrowJobsList.length} jobs`,
          channel: 'email',
          recipientType: 'admin',
          metadata: {
            todayDate: todayDateStr, tomorrowDate: tomorrowDateStr,
            todayJobs: todayJobsList, tomorrowJobs: tomorrowJobsList,
            todayRevenue: fmt(todayRevenue), todayJobCount: todayJobsList.length,
            tomorrowJobCount: tomorrowJobsList.length, todayPaid, todayUnpaid,
          },
        })

        results.push({ type: 'daily_ops_recap', booking_id: 'admin', tenant_id: tenantId })
        sent++
      }

      // ============================================
      // 9PM NIGHTLY DIGEST — summary of all notifications sent today (tenant-local)
      // ============================================
      if (localHour === 21) {
        const { todayStart, todayEnd } = getTenantDayBoundaries(timezone, now)

        const { data: todayNotifs } = await supabaseAdmin
          .from('notifications')
          .select('type, channel, recipient_type, created_at, status')
          .eq('tenant_id', tenantId)
          .eq('status', 'sent')
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString())
          .not('type', 'in', '("daily_ops_recap","daily_digest")')
          .order('created_at')
          .limit(500)

        const emailCount = (todayNotifs || []).filter((n: { channel?: string }) => n.channel === 'email').length
        const smsCount = (todayNotifs || []).filter((n: { channel?: string }) => n.channel === 'sms').length

        const entries = (todayNotifs || []).map((n: any) => ({
          type: n.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          recipient: n.recipient_type || 'unknown',
          time: new Date(n.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone }),
          channel: n.channel || 'email',
        }))

        const dateStr = todayStart.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone })

        await notify({
          tenantId,
          type: 'daily_digest',
          title: `Daily Digest: ${emailCount} emails, ${smsCount} texts — ${dateStr}`,
          message: `${emailCount} email${emailCount !== 1 ? 's' : ''}, ${smsCount} text${smsCount !== 1 ? 's' : ''} sent to clients today`,
          channel: 'email',
          recipientType: 'admin',
          metadata: { date: dateStr, emailCount, smsCount, entries },
        })

        results.push({ type: 'daily_digest', booking_id: 'admin', tenant_id: tenantId })
        sent++
      }

    } catch (tenantErr) {
      // Don't let one tenant's failure crash the whole cron
      failed++
      const errMsg = `Tenant ${tenant.name} (${tenantId}): ${tenantErr instanceof Error ? tenantErr.message : String(tenantErr)}`
      errors.push(errMsg)
      console.error('Cron reminder error:', errMsg)
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
