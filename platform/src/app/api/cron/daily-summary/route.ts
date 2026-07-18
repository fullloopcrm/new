import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { smsDailySummary } from '@/lib/sms-templates'
import { sendSMS } from '@/lib/sms'
import type { BookingTeamLookahead, RecurringScheduleWithClient } from '@/lib/types'
import { safeEqual } from '@/lib/secret-compare'
import { toNaiveET, etYMD, etMidnightUtc, naiveETDayRange } from '@/lib/dates'

export const maxDuration = 300 // Vercel pro plan

// Daily summary cron — runs at 8am
// 1. Admin summary (today's jobs, yesterday's revenue)
// 2. Team member 3-day lookahead (SMS + email)
// 3. Recurring expiration check (30-day warning)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // bookings.start_time/end_time are naive-ET TIMESTAMP columns (no tz) --
  // boundaries against them need naive-ET day-range strings (the ET
  // calendar day), not real UTC instants built off `.setHours(0,0,0,0)`/
  // `.setDate()` (server-local = UTC on Vercel) -- those literal digits get
  // compared straight against the naive column.
  const todayRange = naiveETDayRange(now, 0)
  const tomorrowRange = naiveETDayRange(now, 1)
  const weekEndStart = naiveETDayRange(now, 7).start
  const threeDaysEndBound = naiveETDayRange(now, 3).end

  // payment_date is TIMESTAMPTZ (aware) -- needs a real UTC instant anchored
  // to ET midnight of the relevant ET calendar day, not the naive-ET
  // strings above (which would be misread as UTC instants for an aware
  // column).
  const { y: etY, m: etM, d: etD } = etYMD(now)
  const yesterdayYMD = new Date(Date.UTC(etY, etM - 1, etD - 1))
  const todayMidnightUtc = etMidnightUtc(etY, etM, etD)
  const yesterdayMidnightUtc = etMidnightUtc(yesterdayYMD.getUTCFullYear(), yesterdayYMD.getUTCMonth() + 1, yesterdayYMD.getUTCDate())

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone, resend_api_key')
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
      .gte('start_time', todayRange.start)
      .lt('start_time', tomorrowRange.start)
      .not('status', 'eq', 'cancelled')

    const { data: paidBookings } = await supabaseAdmin
      .from('bookings')
      .select('price')
      .eq('tenant_id', tenantId)
      .gte('payment_date', yesterdayMidnightUtc.toISOString())
      .lt('payment_date', todayMidnightUtc.toISOString())
      .limit(500) // Don't process more than 500 per tenant per run

    const yesterdayRevenue = (paidBookings || []).reduce((sum, b) => sum + (b.price || 0), 0)

    // Count upcoming week
    const { count: weekJobs } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('start_time', todayRange.start)
      .lt('start_time', weekEndStart)
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
      .select('id, name, phone, email, sms_consent')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .limit(500) // Don't process more than 500 per tenant per run

    for (const member of teamMembers || []) {
      const { data: upcomingJobs } = await supabaseAdmin
        .from('bookings')
        .select('id, start_time, end_time, service_type, clients(name, phone, address)')
        .eq('tenant_id', tenantId)
        .eq('team_member_id', member.id)
        .gte('start_time', tomorrowRange.start)
        .lte('start_time', threeDaysEndBound)
        .in('status', ['scheduled', 'confirmed', 'pending'])
        .order('start_time')
        .returns<BookingTeamLookahead[]>()

      if (!upcomingJobs || upcomingJobs.length === 0) continue

      // SMS summary — gated on sms_consent, same as the other SMS send paths
      // fixed this pass (cron/outreach and cron/retention already gate this;
      // this lookahead cron didn't).
      if (member.phone && member.sms_consent !== false && tenant.telnyx_api_key && tenant.telnyx_phone) {
        const smsBody = smsDailySummary(tenant.name, member.name, upcomingJobs.length)
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
    // lastDate below is parsed from a naive-ET start_time string (its digits
    // ARE the ET wall-clock time, not a real UTC instant) -- thirtyDaysOut/
    // nowNaiveET must use that same encoding, or this comparison mixes two
    // different reference frames off by the EST/EDT offset.
    const nowNaiveET = new Date(toNaiveET(now))
    const thirtyDaysOut = new Date(nowNaiveET)
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
        .eq('schedule_id', schedule.id)
        .in('status', ['scheduled', 'pending'])
        .order('start_time', { ascending: false })
        .limit(1)
        .single()

      if (!latestBooking) continue

      const lastDate = new Date(latestBooking.start_time)
      if (lastDate <= thirtyDaysOut && lastDate >= nowNaiveET) {
        const clientName = schedule.clients?.name || 'Unknown'

        // Check if already notified within 7 days
        const { data: existingNotif } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('type', 'recurring_expiring' as string)
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
