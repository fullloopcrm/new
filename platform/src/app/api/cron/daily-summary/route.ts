import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { teamSmsTemplates } from '@/lib/messaging/team-sms-resolver'
import { sendSMS } from '@/lib/sms'
import { isCommEnabled, getCommPrefs } from '@/lib/comms-prefs'
import { getTenantTimezone, getTenantDayBoundaries, isTenantLocalHour, getTenantNaiveDayBoundaries, addCalendarDays, formatCalendarNaive } from '@/lib/tenant-time'
import type { BookingTeamLookahead, RecurringScheduleWithClient, BookingAdminScheduleLine } from '@/lib/types'
import { naiveToAnchoredDate } from '@/lib/naive-time'

export const maxDuration = 300 // Vercel pro plan

const ADMIN_LOCAL_HOUR = 8 // morning recap — today's jobs + yesterday's revenue
const TEAM_LOCAL_HOUR = 20 // 8pm — next-day job lookahead for cleaners

// One line per job: job name, cleaner, estimated duration, start–finish.
// Naive start_time/end_time digits pass straight through toLocaleTimeString
// (no timeZone override) same as the rest of this file — see
// getTenantNaiveDayBoundaries comment above.
function formatAdminScheduleLine(job: BookingAdminScheduleLine): string {
  const jobName = job.service_type || 'Job'
  const cleaner = job.team_members?.name || 'Unassigned'
  const start = new Date(job.start_time)
  const end = new Date(job.end_time)
  const durationHours = Math.round(((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 10) / 10
  const startStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const endStr = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${jobName} | ${cleaner} | ${durationHours}h | ${startStr}-${endStr}`
}

// Daily summary cron — polls hourly, each section fires when it's the right
// local hour in THAT tenant's timezone.
// 1. Admin summary (today's jobs, yesterday's revenue) — 8am tenant-local
// 2. Team member 3-day lookahead (SMS + email) — 8pm tenant-local
// 3. Recurring expiration check (30-day warning) — runs with the admin summary
// 4. Admin next-day schedule text (one line per job, ordered) — 8pm tenant-local
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const now = new Date()

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, industry, phone, owner_phone, website_url, domain, domain_name, google_place_id, telnyx_api_key, telnyx_phone, resend_api_key, timezone')
    .eq('status', 'active')
    .limit(1000)

  let totalSent = 0
  const stats = { tenants_processed: 0, summaries_sent: 0, errors: 0, skipped_wrong_hour: 0 }
  const errorMessages: string[] = []
  const allResults: { tenant: string; adminSent: boolean; teamSent: number; expiring: number; adminScheduleSent: boolean }[] = []

  for (const tenant of tenants || []) {
    const timezone = getTenantTimezone(tenant)
    const runAdmin = isTenantLocalHour(timezone, ADMIN_LOCAL_HOUR, now)
    const runTeam = isTenantLocalHour(timezone, TEAM_LOCAL_HOUR, now)
    if (!runAdmin && !runTeam) {
      stats.skipped_wrong_hour++
      continue
    }

    stats.tenants_processed++
    const tenantId = tenant.id
    // start_time/end_time are naive tenant-local wall-clock columns (no tz) —
    // compare against naive strings. payment_date is real timestamptz — compare
    // against real UTC instants.
    const { todayStartNaive, tomorrowStartNaive, tomorrowEndNaive, today: todayCal } = getTenantNaiveDayBoundaries(timezone, now)
    const { todayStart: todayReal, yesterdayStart: yesterdayReal } = getTenantDayBoundaries(timezone, now)
    const weekEndNaive = formatCalendarNaive(addCalendarDays(todayCal, 7))
    const threeDaysEndNaive = formatCalendarNaive(addCalendarDays(todayCal, 3), 23, 59, 59)

    let adminSent = false
    let teamSent = 0
    let adminScheduleSent = false
    let expiringCount = 0

    try {
    // ============================================
    // ADMIN DAILY SUMMARY — 8am tenant-local
    // ============================================
    if (runAdmin) {
      const { count: todaysJobs } = await supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('start_time', todayStartNaive)
        .lt('start_time', tomorrowStartNaive)
        .not('status', 'eq', 'cancelled')

      const { data: paidBookings } = await supabaseAdmin
        .from('bookings')
        .select('price')
        .eq('tenant_id', tenantId)
        .gte('payment_date', yesterdayReal.toISOString())
        .lt('payment_date', todayReal.toISOString())
        .limit(500) // Don't process more than 500 per tenant per run

      const yesterdayRevenue = (paidBookings || []).reduce((sum, b) => sum + (b.price || 0), 0)

      // Count upcoming week
      const { count: weekJobs } = await supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('start_time', todayStartNaive)
        .lt('start_time', weekEndNaive)
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
      adminSent = true

      // ============================================
      // RECURRING EXPIRATION CHECK — warn 30 days before last booking
      // ============================================
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
              type: 'recurring_expiring',
              title: `Recurring ending: ${clientName}`,
              message: `${clientName}'s ${schedule.recurring_type} schedule ends ${lastDateStr}. Extend in the dashboard.`,
              channel: 'email',
              recipientType: 'admin',
            })

            expiringCount++
          }
        }
      }
    }

    // ============================================
    // TEAM MEMBER 3-DAY LOOKAHEAD — 8pm tenant-local
    // ============================================
    if (runTeam) {
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
          .gte('start_time', tomorrowStartNaive)
          .lte('start_time', threeDaysEndNaive)
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
          const jobsForEmail = upcomingJobs.map(j => {
            const client = j.clients
            const date = naiveToAnchoredDate(j.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' , timeZone: 'UTC' })
            const time = naiveToAnchoredDate(j.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' , timeZone: 'UTC' })
            return {
              clientName: client?.name || 'Client',
              dateTime: `${date} ${time}`,
              address: client?.address || undefined,
            }
          })

          await notify({
            tenantId,
            type: 'daily_summary',
            title: `Next 3 Days: ${upcomingJobs.length} job${upcomingJobs.length === 1 ? '' : 's'}`,
            message: `Hi ${member.name.split(' ')[0]}, here are your upcoming jobs.`,
            channel: 'email',
            recipientType: 'team_member',
            recipientId: member.id,
            metadata: { teamMemberName: member.name, jobs: jobsForEmail },
          })
        }

        // In-app notification
        await notify({
          tenantId,
          type: 'daily_summary',
          title: `${upcomingJobs.length} job${upcomingJobs.length === 1 ? '' : 's'} in next 3 days`,
          message: `You have ${upcomingJobs.length} upcoming job${upcomingJobs.length === 1 ? '' : 's'}`,
          channel: 'push',
          recipientType: 'team_member',
          recipientId: member.id,
        })

        teamSent++
      }

      // ============================================
      // ADMIN NEXT-DAY SCHEDULE TEXT — 8pm tenant-local, same run as the team
      // lookahead above. One line per job (name, cleaner, est. duration,
      // start-finish), in schedule order, so the owner has the full next-day
      // roster in hand — including as a fallback if the dashboard is down.
      // ============================================
      const adminPhone = tenant.owner_phone || tenant.phone
      const adminPrefs = await getCommPrefs(tenantId)
      const adminScheduleOn = adminPrefs.comms.admin_daily_schedule?.sms !== false
      if (adminScheduleOn && adminPhone && tenant.telnyx_api_key && tenant.telnyx_phone) {
        const { data: tomorrowJobs } = await supabaseAdmin
          .from('bookings')
          .select('id, start_time, end_time, service_type, team_members!bookings_team_member_id_fkey(name)')
          .eq('tenant_id', tenantId)
          .gte('start_time', tomorrowStartNaive)
          .lte('start_time', tomorrowEndNaive)
          .in('status', ['scheduled', 'confirmed', 'pending'])
          .order('start_time')
          .limit(200)
          .returns<BookingAdminScheduleLine[]>()

        if (tomorrowJobs && tomorrowJobs.length > 0) {
          const tomorrowLabel = new Date(tomorrowStartNaive).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          const lines = tomorrowJobs.map(formatAdminScheduleLine)
          const body = `${tenant.name} — Schedule ${tomorrowLabel} (${tomorrowJobs.length} job${tomorrowJobs.length === 1 ? '' : 's'}):\n\n${lines.join('\n')}`

          await sendSMS({
            to: adminPhone,
            body,
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          }).catch(() => {})

          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenantId,
            type: 'admin_daily_schedule',
            title: 'Admin Daily Schedule',
            message: `Sent ${tomorrowJobs.length} job(s) for ${tomorrowLabel}`,
            channel: 'sms',
            status: 'sent',
          })

          adminScheduleSent = true
        }
      }
    }

    totalSent += teamSent + (adminScheduleSent ? 1 : 0)
    stats.summaries_sent += (adminSent ? 1 : 0) + teamSent + (adminScheduleSent ? 1 : 0)
    allResults.push({ tenant: tenant.name, adminSent, teamSent, expiring: expiringCount, adminScheduleSent })
    } catch (tenantErr) {
      // Don't let one tenant's failure crash the whole cron
      stats.errors++
      const errMsg = `Tenant ${tenant.name} (${tenantId}): ${tenantErr instanceof Error ? tenantErr.message : String(tenantErr)}`
      errorMessages.push(errMsg)
      console.error('Cron daily-summary error:', errMsg)
    }
  }

  // Health-monitor marker — always runs, every hourly poll, regardless of
  // whether this was an admin/team send hour (health-monitor tolerates up to
  // 28h of silence; this keeps the same hourly heartbeat cadence as before).
  await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    type: 'daily_summary_sent',
    title: 'cron:daily-summary',
    message: `summaries_sent=${totalSent}`,
    channel: 'system',
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return NextResponse.json({ summaries_sent: totalSent, stats, errors: errorMessages.slice(0, 20), details: allResults })
}
