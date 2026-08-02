/**
 * Admin dashboard aggregator — today/week/month/year bookings, map data,
 * financials, client counts, team list. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission, overridesFor } from '@/lib/require-permission'
import { hasPermission } from '@/lib/rbac'

interface BookingRow {
  price: number | null
  status?: string
}

export async function GET() {
  try {
    // The main admin dashboard aggregator had NO permission check at all --
    // only getTenantForRequest() -- and returned real financial data (today/
    // week/month/pending revenue) plus full client PII unconditionally. Same
    // live, default-config gap class as jobs.ts's GET this session: 'staff'
    // has bookings.view but lacks finance.view by default, so any staff-role
    // team member could already see the full revenue breakdown here. Gated
    // on bookings.view (matches the dashboard's own primary content -- jobs/
    // clients), and the `financials` field is zeroed out for roles without
    // finance.view, same split already established on jobs.ts and
    // jobs/[id]/route.ts.
    const { tenant, error: authError } = await requirePermission('bookings.view')
    if (authError) return authError
    const { tenantId } = tenant
    const canViewFinance = hasPermission(tenant.role, 'finance.view', overridesFor(tenant))
    const db = tenantDb(tenantId)

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
    const startOfWeek = new Date(startOfDay)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const fourteenDaysOut = new Date(endOfDay.getTime() + 14 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59)

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
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', endOfDay.toISOString())
        .in('status', [...liveStatuses, 'completed'])
        .order('start_time'),
      db
        .from('bookings')
        .select('id, start_time, status, service_type, team_member_id, clients(name, address), team_members!bookings_team_member_id_fkey(name)')
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', endOfDay.toISOString())
        .in('status', [...liveStatuses, 'completed']),
      db
        .from('bookings')
        .select('id, start_time, status, service_type, team_member_id, clients(name, address), team_members!bookings_team_member_id_fkey(name)')
        .gte('start_time', startOfWeek.toISOString())
        .lt('start_time', endOfWeek.toISOString())
        .in('status', [...liveStatuses, 'completed']),
      db
        .from('bookings')
        .select('id, start_time, status, service_type, team_member_id, clients(name, address), team_members!bookings_team_member_id_fkey(name)')
        .gte('start_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString())
        .in('status', [...liveStatuses, 'completed']),
      db
        .from('bookings')
        .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
        .gte('start_time', startOfYear.toISOString())
        .lte('start_time', endOfYear.toISOString())
        .order('start_time'),
      db
        .from('bookings')
        .select('price')
        .eq('status', 'completed')
        .eq('payment_status', 'pending'),
      db
        .from('bookings')
        .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', fourteenDaysOut.toISOString())
        .in('status', liveStatuses)
        .order('start_time'),
      db
        .from('clients')
        .select('id', { count: 'exact', head: true }),
      db
        .from('clients')
        .select('*')
        .gte('created_at', startOfMonth.toISOString()),
      db
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('start_time', thirtyDaysAgo.toISOString()),
      db
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .in('status', liveStatuses)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfYear.toISOString()),
      db
        .from('bookings')
        .select('price')
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', endOfDay.toISOString())
        .eq('status', 'completed')
        .eq('payment_status', 'paid'),
      db
        .from('bookings')
        .select('price')
        .gte('start_time', startOfWeek.toISOString())
        .lt('start_time', endOfWeek.toISOString())
        .eq('status', 'completed')
        .eq('payment_status', 'paid'),
      db
        .from('bookings')
        .select('price')
        .gte('start_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString())
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

    return NextResponse.json({
      todayJobs: todayRes.data || [],
      upcomingBookings: upcomingRes.data || [],
      allJobs: allJobsRes.data || [],
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
      } : {
        today: { revenue: 0, jobs: 0 },
        week: { revenue: 0, jobs: 0 },
        month: { revenue: 0, jobs: 0 },
        pending: { revenue: 0, jobs: 0 },
      },
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
