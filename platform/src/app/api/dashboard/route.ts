/**
 * Admin dashboard aggregator — today/week/month/year bookings, map data,
 * financials, client counts, team list. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission, overridesFor } from '@/lib/require-permission'
import { hasPermission } from '@/lib/rbac'
import { nowNaiveET, etToday, addCalendarDays, calendarDayOfWeek, formatNaiveET } from '@/lib/recurring'

interface BookingRow {
  price: number | null
  status?: string
}

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.view')
    if (authError) return authError
    const { tenantId } = tenant
    const db = tenantDb(tenantId)
    // Revenue numbers are finance-sensitive; this aggregator otherwise serves
    // every bookings.view role (incl. staff), so redact for anyone without
    // finance.view rather than blocking the whole endpoint.
    const canViewFinance = hasPermission(tenant.role, 'finance.view', overridesFor(tenant))

    // start_time/end_time are naive-ET (computeNaiveVisitWindow's documented
    // convention). These boundaries used to be built from `new Date(
    // now.getFullYear(), now.getMonth(), now.getDate())` -- the SERVER's
    // local (UTC on Vercel) calendar, not ET -- silently shifting every
    // today/week/month/year cutoff by the ET/UTC gap (4h EDT / 5h EST), the
    // day-boundary counterpart of the naive-ET/true-UTC instant-cutoff bug
    // fixed elsewhere this session (see recurring.ts's nowNaiveET header).
    const today = etToday()
    const startOfDayET = formatNaiveET(today)
    const endOfDayET = formatNaiveET(addCalendarDays(today, 1))
    const startOfWeek = addCalendarDays(today, -calendarDayOfWeek(today))
    const endOfWeek = addCalendarDays(startOfWeek, 7)
    const startOfWeekET = formatNaiveET(startOfWeek)
    const endOfWeekET = formatNaiveET(endOfWeek)
    const startOfMonthET = formatNaiveET({ ...today, day: 1 })
    // Day 0 of next month = last day of this month.
    const endOfMonthET = formatNaiveET(addCalendarDays({ year: today.year, month: today.month + 1, day: 1 }, -1), 23, 59, 59)
    const fourteenDaysOutET = formatNaiveET(addCalendarDays(today, 15)) // endOfDay + 14 days
    const thirtyDaysAgoET = nowNaiveET(-30 * 24 * 60 * 60 * 1000)
    const startOfYearET = formatNaiveET({ year: today.year, month: 0, day: 1 })
    const endOfYearET = formatNaiveET({ year: today.year, month: 11, day: 31 }, 23, 59, 59)

    // clients.created_at is a genuine timestamptz (`DEFAULT NOW()`), unlike
    // start_time/end_time -- keep a true-UTC month-start boundary for it.
    const now = new Date()
    const startOfMonthUTC = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const liveStatuses = ['confirmed', 'scheduled', 'in_progress']

    const [
      todayRes, mapTodayRes, mapWeekRes, mapMonthRes, allJobsRes,
      pendingPaymentRes, upcomingRes, allClientsRes, recentClientsRes,
      completedRecentRes, scheduledAllRes,
      todayPaidRes, weekPaidRes, monthPaidRes, teamListRes,
    ] = await Promise.all([
      db
        .from('bookings')
        .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
        .gte('start_time', startOfDayET)
        .lt('start_time', endOfDayET)
        .in('status', [...liveStatuses, 'completed'])
        .order('start_time'),
      db
        .from('bookings')
        .select('id, start_time, status, service_type, team_member_id, clients(name, address), team_members!bookings_team_member_id_fkey(name)')
        .gte('start_time', startOfDayET)
        .lt('start_time', endOfDayET)
        .in('status', [...liveStatuses, 'completed']),
      db
        .from('bookings')
        .select('id, start_time, status, service_type, team_member_id, clients(name, address), team_members!bookings_team_member_id_fkey(name)')
        .gte('start_time', startOfWeekET)
        .lt('start_time', endOfWeekET)
        .in('status', [...liveStatuses, 'completed']),
      db
        .from('bookings')
        .select('id, start_time, status, service_type, team_member_id, clients(name, address), team_members!bookings_team_member_id_fkey(name)')
        .gte('start_time', startOfMonthET)
        .lte('start_time', endOfMonthET)
        .in('status', [...liveStatuses, 'completed']),
      db
        .from('bookings')
        .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
        .gte('start_time', startOfYearET)
        .lte('start_time', endOfYearET)
        .order('start_time'),
      db
        .from('bookings')
        .select('price')
        .eq('status', 'completed')
        .eq('payment_status', 'pending'),
      db
        .from('bookings')
        .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
        .gte('start_time', startOfDayET)
        .lt('start_time', fourteenDaysOutET)
        .in('status', liveStatuses)
        .order('start_time'),
      db
        .from('clients')
        .select('id', { count: 'exact', head: true }),
      db
        .from('clients')
        .select('*')
        .gte('created_at', startOfMonthUTC),
      db
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('start_time', thirtyDaysAgoET),
      db
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('status', liveStatuses)
        .gte('start_time', startOfDayET)
        .lte('start_time', endOfYearET),
      db
        .from('bookings')
        .select('price')
        .gte('start_time', startOfDayET)
        .lt('start_time', endOfDayET)
        .eq('status', 'completed')
        .eq('payment_status', 'paid'),
      db
        .from('bookings')
        .select('price')
        .gte('start_time', startOfWeekET)
        .lt('start_time', endOfWeekET)
        .eq('status', 'completed')
        .eq('payment_status', 'paid'),
      db
        .from('bookings')
        .select('price')
        .gte('start_time', startOfMonthET)
        .lte('start_time', endOfMonthET)
        .eq('status', 'completed')
        .eq('payment_status', 'paid'),
      db
        .from('team_members')
        .select('id, name')
        .eq('status', 'active')
        .order('name'),
    ])

    const calcRevenue = (jobs: BookingRow[] | null) =>
      (jobs || []).reduce((sum, b) => sum + (b.price || 0), 0)

    const normalizeMapJobs = (jobs: BookingRow[] | null) =>
      (jobs || []).map(j => ({
        ...j,
        status: j.status === 'confirmed' ? 'scheduled' : j.status,
      }))

    // todayRes/upcomingRes/allJobsRes embed team_members(*) (full row, via
    // the booking's assigned-cleaner FK) -- pin is a team-portal login
    // credential, not booking data, and this endpoint is gated only on
    // bookings.view (held by 'staff' by default). Strip it before it ever
    // reaches the response, same class as the GET /api/team[/id] fix.
    type BookingWithTeamMember = Record<string, unknown> & {
      team_members?: (Record<string, unknown> & { pin?: unknown }) | null
    }
    const stripTeamMemberPin = (rows: unknown) =>
      ((rows as BookingWithTeamMember[] | null) || []).map(row => {
        if (!row.team_members || typeof row.team_members !== 'object') return row
        const { pin: _pin, ...teamMember } = row.team_members
        return { ...row, team_members: teamMember }
      })

    return NextResponse.json({
      todayJobs: stripTeamMemberPin(todayRes.data),
      upcomingBookings: stripTeamMemberPin(upcomingRes.data),
      allJobs: stripTeamMemberPin(allJobsRes.data),
      mapJobs: {
        today: normalizeMapJobs(mapTodayRes.data as BookingRow[] | null),
        week: normalizeMapJobs(mapWeekRes.data as BookingRow[] | null),
        month: normalizeMapJobs(mapMonthRes.data as BookingRow[] | null),
      },
      financials: canViewFinance ? {
        today: { revenue: calcRevenue(todayPaidRes.data as BookingRow[] | null), jobs: todayPaidRes.data?.length || 0 },
        week: { revenue: calcRevenue(weekPaidRes.data as BookingRow[] | null), jobs: weekPaidRes.data?.length || 0 },
        month: { revenue: calcRevenue(monthPaidRes.data as BookingRow[] | null), jobs: monthPaidRes.data?.length || 0 },
        pending: { revenue: calcRevenue(pendingPaymentRes.data as BookingRow[] | null), jobs: pendingPaymentRes.data?.length || 0 },
      } : null,
      clients: {
        total: allClientsRes.count || 0,
        newThisMonth: recentClientsRes.data?.length || 0,
      },
      stats: {
        scheduled: scheduledAllRes.count || 0,
        completed: completedRecentRes.count || 0,
        pending_payment: pendingPaymentRes.data?.length || 0,
      },
      teamMembers: teamListRes.data || [],
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/dashboard error:', err)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
