/**
 * Admin dashboard aggregator — today/week/month/year bookings, map data,
 * financials, client counts, team list. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

interface BookingRow {
  price: number | null
  status?: string
}

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

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
      supabaseAdmin
        .from('bookings')
        .select('*, clients(*), team_members(*)')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', endOfDay.toISOString())
        .in('status', [...liveStatuses, 'completed'])
        .order('start_time'),
      supabaseAdmin
        .from('bookings')
        .select('id, start_time, status, service_type, team_member_id, clients(name, address), team_members(name)')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', endOfDay.toISOString())
        .in('status', [...liveStatuses, 'completed']),
      supabaseAdmin
        .from('bookings')
        .select('id, start_time, status, service_type, team_member_id, clients(name, address), team_members(name)')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfWeek.toISOString())
        .lt('start_time', endOfWeek.toISOString())
        .in('status', [...liveStatuses, 'completed']),
      supabaseAdmin
        .from('bookings')
        .select('id, start_time, status, service_type, team_member_id, clients(name, address), team_members(name)')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString())
        .in('status', [...liveStatuses, 'completed']),
      supabaseAdmin
        .from('bookings')
        .select('*, clients(*), team_members(*)')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfYear.toISOString())
        .lte('start_time', endOfYear.toISOString())
        .order('start_time'),
      supabaseAdmin
        .from('bookings')
        .select('price')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .eq('payment_status', 'pending'),
      supabaseAdmin
        .from('bookings')
        .select('*, clients(*), team_members(*)')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', fourteenDaysOut.toISOString())
        .in('status', liveStatuses)
        .order('start_time'),
      supabaseAdmin
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      supabaseAdmin
        .from('clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfMonth.toISOString()),
      supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('start_time', thirtyDaysAgo.toISOString()),
      supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', liveStatuses)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfYear.toISOString()),
      supabaseAdmin
        .from('bookings')
        .select('price')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', endOfDay.toISOString())
        .eq('status', 'completed')
        .eq('payment_status', 'paid'),
      supabaseAdmin
        .from('bookings')
        .select('price')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfWeek.toISOString())
        .lt('start_time', endOfWeek.toISOString())
        .eq('status', 'completed')
        .eq('payment_status', 'paid'),
      supabaseAdmin
        .from('bookings')
        .select('price')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString())
        .eq('status', 'completed')
        .eq('payment_status', 'paid'),
      supabaseAdmin
        .from('team_members')
        .select('id, name')
        .eq('tenant_id', tenantId)
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
      financials: {
        today: { revenue: calcRevenue(todayPaidRes.data as BookingRow[] | null), jobs: todayPaidRes.data?.length || 0 },
        week: { revenue: calcRevenue(weekPaidRes.data as BookingRow[] | null), jobs: weekPaidRes.data?.length || 0 },
        month: { revenue: calcRevenue(monthPaidRes.data as BookingRow[] | null), jobs: monthPaidRes.data?.length || 0 },
        pending: { revenue: calcRevenue(pendingPaymentRes.data as BookingRow[] | null), jobs: pendingPaymentRes.data?.length || 0 },
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
