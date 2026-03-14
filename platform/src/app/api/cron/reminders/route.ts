import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { smsReminder } from '@/lib/sms-templates'
import { sendSMS } from '@/lib/sms'
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
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results: { type: string; booking_id: string; tenant_id: string }[] = []
  let sent = 0
  let failed = 0
  const errors: string[] = []

  // Get all active tenants
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone, resend_api_key')
    .eq('status', 'active')
    .limit(1000)

  for (const tenant of tenants || []) {
    const tenantId = tenant.id

    try {
      // ============================================
      // DAY-BASED REMINDERS — send at 8am (per server TZ)
      // 3 days before + 1 day before
      // ============================================
      if (now.getHours() === 8) {
        for (const daysOut of [3, 1]) {
          const target = new Date(now)
          target.setDate(target.getDate() + daysOut)
          target.setHours(0, 0, 0, 0)
          const targetEnd = new Date(target)
          targetEnd.setHours(23, 59, 59, 999)
          const label = daysOut === 1 ? 'tomorrow' : `in ${daysOut} days`
          const emailType = `reminder_${daysOut}day`

          const { data: bookings } = await supabaseAdmin
            .from('bookings')
            .select('id, client_id, team_member_id, service_type, start_time, end_time, clients(name, phone, email), team_members(name, phone, email)')
            .eq('tenant_id', tenantId)
            .in('status', ['scheduled', 'confirmed'])
            .gte('start_time', target.toISOString())
            .lte('start_time', targetEnd.toISOString())
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

            // Client email reminder
            if (client?.email) {
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

            // Client SMS reminder
            if (client?.phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
              const smsData = { start_time: booking.start_time, team_members: booking.team_members }
              const smsBody = smsReminder(tenant.name, smsData, label)
              try {
                await sendSMS({ to: client.phone, body: smsBody, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone })
                sent++
              } catch (smsErr) {
                failed++
                errors.push(`SMS to ${client.phone} for booking ${booking.id}: ${smsErr instanceof Error ? smsErr.message : String(smsErr)}`)
              }
            }

            // Team member reminder (day before only)
            if (daysOut === 1 && booking.team_member_id) {
              const member = booking.team_members
              if (member) {
                await notify({
                  tenantId,
                  type: 'booking_reminder',
                  title: 'Job Tomorrow',
                  message: `${client?.name || 'Client'} - ${label} at ${new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
                  channel: 'sms',
                  recipientType: 'team_member',
                  recipientId: booking.team_member_id,
                  bookingId: booking.id,
                })
              }
            }

            results.push({ type: emailType, booking_id: booking.id, tenant_id: tenantId })
            sent++
          }
        }
      }

      // ============================================
      // HOUR-BASED REMINDERS — runs every hour, sends 2hr before
      // ============================================
      const twoHoursAhead = new Date(now.getTime() + 2 * 60 * 60 * 1000)
      const hourWindowStart = new Date(twoHoursAhead)
      hourWindowStart.setMinutes(0, 0, 0)
      const hourWindowEnd = new Date(hourWindowStart)
      hourWindowEnd.setMinutes(59, 59, 999)

      const { data: hourBookings } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id, team_member_id, service_type, start_time, clients(name, phone, email), team_members(name, phone)')
        .eq('tenant_id', tenantId)
        .in('status', ['scheduled', 'confirmed'])
        .gte('start_time', hourWindowStart.toISOString())
        .lte('start_time', hourWindowEnd.toISOString())
        .limit(500)
        .returns<BookingWith2HourReminder[]>()

      for (const booking of hourBookings || []) {
        const emailType = 'reminder_2hour'
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

        // Client SMS — 2hr reminder
        if (client?.phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
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
          const smsBody = `${tenant.name}: Job in 2 hours — ${client?.name || 'Client'} at ${new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
          try {
            await sendSMS({ to: member.phone, body: smsBody, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone })
            sent++
          } catch (smsErr) {
            failed++
            errors.push(`2hr SMS to team ${booking.team_member_id}: ${smsErr instanceof Error ? smsErr.message : String(smsErr)}`)
          }
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

      // ============================================
      // PAYMENT ALERT — 15 min before booking end_time
      // ============================================
      const payWindowStart = new Date(now.getTime() + 10 * 60 * 1000)
      const payWindowEnd = new Date(now.getTime() + 20 * 60 * 1000)

      const { data: endingSoon } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id, start_time, end_time, hourly_rate, clients(name), team_members(name)')
        .eq('tenant_id', tenantId)
        .eq('status', 'in_progress')
        .gte('end_time', payWindowStart.toISOString())
        .lte('end_time', payWindowEnd.toISOString())
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
      // THANK YOU EMAIL — 3 days after first booking (8am only)
      // ============================================
      if (now.getHours() === 8) {
        const threeDaysAgo = new Date(now)
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
        threeDaysAgo.setHours(0, 0, 0, 0)
        const threeDaysAgoEnd = new Date(threeDaysAgo)
        threeDaysAgoEnd.setHours(23, 59, 59, 999)

        const { data: completedBookings } = await supabaseAdmin
          .from('bookings')
          .select('id, client_id, service_type, clients(name, email)')
          .eq('tenant_id', tenantId)
          .in('status', ['completed', 'paid'])
          .gte('end_time', threeDaysAgo.toISOString())
          .lte('end_time', threeDaysAgoEnd.toISOString())
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
            .lt('end_time', threeDaysAgo.toISOString())

          if ((count || 0) === 0) {
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
            results.push({ type: 'thank_you', booking_id: booking.id, tenant_id: tenantId })
            sent++
          }
        }
      }

      // ============================================
      // UNPAID TEAM ALERTS — 8am, completed 2+ days ago with unpaid team
      // ============================================
      if (now.getHours() === 8) {
        const twoDaysAgo = new Date(now)
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

        const { data: unpaidBookings } = await supabaseAdmin
          .from('bookings')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('status', 'completed')
          .lt('end_time', twoDaysAgo.toISOString())
          .or('team_paid.is.null,team_paid.eq.false')
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
      // PENDING BOOKING ALERTS — 8am and 2pm, unassigned bookings
      // ============================================
      if (now.getHours() === 8 || now.getHours() === 14) {
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
            type: 'booking_reminder',
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
      // 8PM DAILY OPS RECAP — today's jobs + financials + tomorrow preview
      // ============================================
      if (now.getHours() === 20) {
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
        const tomorrowStart = new Date(now); tomorrowStart.setDate(tomorrowStart.getDate() + 1); tomorrowStart.setHours(0, 0, 0, 0)
        const tomorrowEnd = new Date(tomorrowStart); tomorrowEnd.setHours(23, 59, 59, 999)

        const { data: todayBookings } = await supabaseAdmin
          .from('bookings')
          .select('id, start_time, end_time, price, payment_status, service_type, clients(name), team_members(name)')
          .eq('tenant_id', tenantId)
          .gte('start_time', todayStart.toISOString())
          .lte('start_time', todayEnd.toISOString())
          .neq('status', 'cancelled')
          .order('start_time')
          .limit(500)

        const { data: tomorrowBookings } = await supabaseAdmin
          .from('bookings')
          .select('id, start_time, end_time, price, service_type, clients(name), team_members(name)')
          .eq('tenant_id', tenantId)
          .gte('start_time', tomorrowStart.toISOString())
          .lte('start_time', tomorrowEnd.toISOString())
          .in('status', ['scheduled', 'confirmed'])
          .order('start_time')
          .limit(500)

        const fmt = (cents: number) => '$' + (cents / 100).toFixed(0)
        const todayRevenue = (todayBookings || []).reduce((s: number, b: { price?: number }) => s + (b.price || 0), 0)
        const todayPaid = (todayBookings || []).filter((b: { payment_status?: string }) => b.payment_status === 'paid').length
        const todayUnpaid = (todayBookings || []).length - todayPaid

        const todayDateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        const tomorrowDateObj = new Date(now); tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1)
        const tomorrowDateStr = tomorrowDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

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
      // 9PM NIGHTLY DIGEST — summary of all notifications sent today
      // ============================================
      if (now.getHours() === 21) {
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)

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
          time: new Date(n.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          channel: n.channel || 'email',
        }))

        const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

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
