import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { teamSmsTemplates } from '@/lib/messaging/team-sms-resolver'
import { sendSMS } from '@/lib/sms'
import { isCommEnabled } from '@/lib/comms-prefs'
import type { BookingTeamLookahead, RecurringScheduleWithClient } from '@/lib/types'

export const maxDuration = 300 // Vercel pro plan

// Daily summary cron — runs at 8am
// 1. Admin summary (today's jobs, yesterday's revenue)
// 2. Team member 3-day lookahead (SMS + email)
// 3. Recurring expiration check (30-day warning)
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const threeDaysEnd = new Date(today)
  threeDaysEnd.setDate(threeDaysEnd.getDate() + 3)
  threeDaysEnd.setHours(23, 59, 59, 999)

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, industry, phone, website_url, domain, domain_name, google_place_id, telnyx_api_key, telnyx_phone, resend_api_key')
    .eq('status', 'active')
    .limit(1000)

  let totalSent = 0
  const stats = { tenants_processed: 0, summaries_sent: 0, errors: 0 }
  const errorMessages: string[] = []
  const allResults: { tenant: string; adminSent: boolean; teamSent: number; expiring: number }[] = []

  for (const tenant of tenants || []) {
    stats.tenants_processed++
    const tenantId = tenant.id

    try {
    // ============================================
    // ADMIN DAILY SUMMARY
    // ============================================
    const { count: todaysJobs } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .not('status', 'eq', 'cancelled')

    const { data: paidBookings } = await supabaseAdmin
      .from('bookings')
      .select('price')
      .eq('tenant_id', tenantId)
      .gte('payment_date', yesterday.toISOString())
      .lt('payment_date', today.toISOString())
      .limit(500) // Don't process more than 500 per tenant per run

    const yesterdayRevenue = (paidBookings || []).reduce((sum, b) => sum + (b.price || 0), 0)

    // Count upcoming week
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const { count: weekJobs } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('start_time', today.toISOString())
      .lt('start_time', weekEnd.toISOString())
      .not('status', 'eq', 'cancelled')

    const message = [
      `Good morning from ${tenant.name}!`,
      `Today's jobs: ${todaysJobs || 0}`,
      `This week: ${weekJobs || 0} jobs`,
      `Yesterday's revenue: $${(yesterdayRevenue / 100).toFixed(2)}`,
    ].join('\n')

    await notify({
      tenantId,
      type: 'daily_summary',
      title: `Daily Summary — ${tenant.name}`,
      message,
      channel: 'email',
      recipientType: 'admin',
      metadata: { todaysJobs: todaysJobs || 0, yesterdayRevenue: `$${(yesterdayRevenue / 100).toFixed(2)}`, upcomingSchedules: weekJobs || 0 },
    })
    totalSent++

    // ============================================
    // TEAM MEMBER 3-DAY LOOKAHEAD
    // ============================================
    let teamSent = 0

    const { data: teamMembers } = await supabaseAdmin
      .from('team_members')
      .select('id, name, phone, email, pin')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .limit(500) // Don't process more than 500 per tenant per run

    for (const member of teamMembers || []) {
      const { data: upcomingJobs } = await supabaseAdmin
        .from('bookings')
        .select('id, start_time, end_time, service_type, hourly_rate, clients(name, phone, address)')
        .eq('tenant_id', tenantId)
        .eq('team_member_id', member.id)
        .gte('start_time', tomorrow.toISOString())
        .lte('start_time', threeDaysEnd.toISOString())
        .in('status', ['scheduled', 'confirmed', 'pending'])
        .order('start_time')
        .returns<BookingTeamLookahead[]>()

      if (!upcomingJobs || upcomingJobs.length === 0) continue

      // SMS summary
      if (member.phone && tenant.telnyx_api_key && tenant.telnyx_phone && (await isCommEnabled(tenantId, 'team_daily_summary', 'sms'))) {
        const smsBody = teamSmsTemplates(tenant).dailySummary(member.name, upcomingJobs.length, member.pin || undefined, upcomingJobs)
        await sendSMS({
          to: member.phone,
          body: smsBody,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        }).catch(() => {})
      }

      // Email with job details
      if (member.email) {
        const jobDetails = upcomingJobs.map(j => {
          const client = j.clients
          const date = new Date(j.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          const time = new Date(j.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          return `${date} ${time} — ${client?.name || 'Client'}${client?.address ? ` @ ${client.address}` : ''}`
        }).join('<br>')

        await notify({
          tenantId,
          type: 'daily_summary',
          title: `Next 3 Days: ${upcomingJobs.length} job${upcomingJobs.length === 1 ? '' : 's'}`,
          message: `Hi ${member.name.split(' ')[0]}, here are your upcoming jobs:\n${jobDetails}`,
          channel: 'email',
          recipientType: 'team_member',
          recipientId: member.id,
        })
      }

      // In-app notification
      await notify({
        tenantId,
        type: 'daily_summary',
        title: `${upcomingJobs.length} job${upcomingJobs.length === 1 ? '' : 's'} in next 3 days`,
        message: `You have ${upcomingJobs.length} upcoming job${upcomingJobs.length === 1 ? '' : 's'}`,
        channel: 'push' as 'email',
        recipientType: 'team_member',
        recipientId: member.id,
      })

      teamSent++
    }

    // ============================================
    // RECURRING EXPIRATION CHECK — warn 30 days before last booking
    // ============================================
    let expiringCount = 0
    const thirtyDaysOut = new Date(now)
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)

    const { data: schedules } = await supabaseAdmin
      .from('recurring_schedules')
      .select('id, client_id, recurring_type, clients(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .limit(500) // Don't process more than 500 per tenant per run
      .returns<RecurringScheduleWithClient[]>()

    for (const schedule of schedules || []) {
      const { data: latestBooking } = await supabaseAdmin
        .from('bookings')
        .select('start_time')
        .eq('tenant_id', tenantId)
        .eq('schedule_id', schedule.id)
        .in('status', ['scheduled', 'pending'])
        .order('start_time', { ascending: false })
        .limit(1)
        .single()

      if (!latestBooking) continue

      const lastDate = new Date(latestBooking.start_time)
      if (lastDate <= thirtyDaysOut && lastDate >= now) {
        const clientName = schedule.clients?.name || 'Unknown'

        // Check if already notified within 7 days — scoped to THIS client's
        // recurring_type, not just tenant+type, so one schedule's dedup
        // window doesn't suppress every other schedule in the same tenant.
        const { data: existingNotif } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('type', 'recurring_expiring' as string)
          .like('message', `%${clientName}%${schedule.recurring_type}%`)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1)

        if (!existingNotif || existingNotif.length === 0) {
          const lastDateStr = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenantId,
            type: 'recurring_expiring',
            title: 'Recurring Booking Ending Soon',
            message: `${clientName} — ${schedule.recurring_type} ends ${lastDateStr}`,
            channel: 'in_app',
            status: 'sent',
          })

          await notify({
            tenantId,
            type: 'booking_reminder',
            title: `Recurring ending: ${clientName}`,
            message: `${clientName}'s ${schedule.recurring_type} schedule ends ${lastDateStr}. Extend in the dashboard.`,
            channel: 'email',
            recipientType: 'admin',
          })

          expiringCount++
        }
      }
    }

    totalSent += teamSent
    stats.summaries_sent += 1 + teamSent
    allResults.push({ tenant: tenant.name, adminSent: true, teamSent, expiring: expiringCount })
    } catch (tenantErr) {
      // Don't let one tenant's failure crash the whole cron
      stats.errors++
      const errMsg = `Tenant ${tenant.name} (${tenantId}): ${tenantErr instanceof Error ? tenantErr.message : String(tenantErr)}`
      errorMessages.push(errMsg)
      console.error('Cron daily-summary error:', errMsg)
    }
  }

  // Health-monitor marker.
  await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    type: 'daily_summary_sent',
    title: 'cron:daily-summary',
    message: `summaries_sent=${totalSent}`,
    channel: 'system',
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return NextResponse.json({ summaries_sent: totalSent, stats, errors: errorMessages.slice(0, 20), details: allResults })
}
