/**
 * Admin dashboard aggregator — today/week/month/year bookings, map data,
 * financials, client counts, team list. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { hasPermission } from '@/lib/rbac'
import { overridesFor } from '@/lib/require-permission'

interface BookingRow {
  price: number | null
  status?: string
  payment_status?: string
  partial_payment_cents?: number | null
}

// team_members joined via `!bookings_team_member_id_fkey(*)` pulls the full
// row including `pin` -- the team-portal login credential -- into every
// booking-derived widget. None of this route's consumers read that field;
// strip it unconditionally regardless of the caller's role (mirrors the
// GET /api/team list fix).
function stripJoinedTeamMemberPin<T extends { team_members?: unknown }>(row: T): T {
  const joined = row.team_members
  if (!joined || typeof joined !== 'object') return row
  const { pin: _pin, ...rest } = joined as Record<string, unknown>
  return { ...row, team_members: rest }
}

function stripJoinedTeamMemberPins<T extends { team_members?: unknown }>(
  rows: T[] | null,
): T[] {
  return (rows || []).map(stripJoinedTeamMemberPin)
}

export async function GET() {
  try {
    const ctx = await getTenantForRequest()
    const { tenantId } = ctx
    const canViewFinance = hasPermission(ctx.role, 'finance.view', overridesFor(ctx))
    const canViewTeam = hasPermission(ctx.role, 'team.view', overridesFor(ctx))

    // bookings.start_time is stored naive-ET (no tz, literally what was
    // typed in). The old `new Date().getFullYear()/getMonth()/getDate()`
    // read the SERVER's local calendar (UTC on Vercel), a full day ahead of
    // ET for ~4-5h every evening -- during that window an operator opening
    // this dashboard (the main landing page for every tenant) at 7-11pm ET
    // saw an empty "today's jobs" section, a wrong map-today pin set, and a
    // 14-day upcoming list missing its first day, despite real jobs still
    // ahead. Same pattern already established this session (cron/schedule-
    // monitor, team-portal/jobs, team-portal/crew/schedule, team-portal/
    // earnings). Kept as naive ET wall-clock strings for every boundary
    // that filters bookings.start_time.
    const pad = (n: number) => String(n).padStart(2, '0')
    const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
    const now = new Date()
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    const [ty, tm, td] = todayStr.split('-').map(Number)
    const todayObj = new Date(Date.UTC(ty, tm - 1, td))
    const tomorrowObj = new Date(Date.UTC(ty, tm - 1, td + 1))
    const startOfDay = `${ymd(todayObj)}T00:00:00`
    const endOfDay = `${ymd(tomorrowObj)}T00:00:00`
    // Week starts Sunday, matching the original `getDay()`-based math --
    // todayObj's getUTCDay() reflects the true ET weekday (built purely from
    // ET y/m/d via Date.UTC), unlike a server-local getDay() would.
    const sunOffset = todayObj.getUTCDay()
    const startOfWeekObj = new Date(Date.UTC(ty, tm - 1, td - sunOffset))
    const endOfWeekObj = new Date(Date.UTC(ty, tm - 1, td - sunOffset + 7))
    const startOfWeek = `${ymd(startOfWeekObj)}T00:00:00`
    const endOfWeek = `${ymd(endOfWeekObj)}T00:00:00`
    const startOfMonthObj = new Date(Date.UTC(ty, tm - 1, 1))
    const endOfMonthObj = new Date(Date.UTC(ty, tm, 0))
    const startOfMonth = `${ymd(startOfMonthObj)}T00:00:00`
    const endOfMonth = `${ymd(endOfMonthObj)}T23:59:59`
    const fourteenDaysOutObj = new Date(Date.UTC(ty, tm - 1, td + 15))
    const fourteenDaysOut = `${ymd(fourteenDaysOutObj)}T00:00:00`
    const startOfYear = `${ty}-01-01T00:00:00`
    const endOfYear = `${ty}-12-31T23:59:59`
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    // clients.created_at is TIMESTAMPTZ (unlike bookings.start_time) -- a
    // true-UTC ISO instant is the correct comparison type for it, so this
    // one keeps the original server-local-month Date object rather than the
    // naive-ET string above (which would be misinterpreted against an aware
    // column). Out of scope for this pass: still a coarser "which month"
    // boundary than true ET, but not the naive-vs-aware bug this fixes.
    const startOfMonthForClientsCreatedAt = new Date(now.getFullYear(), now.getMonth(), 1)

    const liveStatuses = ['confirmed', 'scheduled', 'in_progress']
    // POST /api/finance/payroll flips a booking's status straight to 'paid'
    // once the team member is paid out -- that only means team-pay happened,
    // it says nothing about whether the job itself should still show as a
    // real job on today/week/month lists and the map. Every "+ completed"
    // status filter below needs "+ paid" too or a job silently vanishes from
    // the operator's own dashboard the moment payroll runs on it. Same root
    // cause as the finance/pnl, finance/summary, cleaner-income, crew-earnings,
    // reconcile-candidates, ar-aging, pending, client-analytics sweep.
    const doneStatuses = [...liveStatuses, 'completed', 'paid']

    const [
      todayRes, mapTodayRes, mapWeekRes, mapMonthRes, allJobsRes,
      pendingPaymentRes, upcomingRes, allClientsRes, recentClientsRes,
      completedRecentRes, scheduledAllRes,
      todayPaidRes, weekPaidRes, monthPaidRes, teamListRes,
    ] = await Promise.all([
      supabaseAdmin
        .from('bookings')
        .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfDay)
        .lt('start_time', endOfDay)
        .in('status', doneStatuses)
        .order('start_time'),
      supabaseAdmin
        .from('bookings')
        .select('id, start_time, status, service_type, team_member_id, clients(name, address), team_members!bookings_team_member_id_fkey(name)')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfDay)
        .lt('start_time', endOfDay)
        .in('status', doneStatuses),
      supabaseAdmin
        .from('bookings')
        .select('id, start_time, status, service_type, team_member_id, clients(name, address), team_members!bookings_team_member_id_fkey(name)')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfWeek)
        .lt('start_time', endOfWeek)
        .in('status', doneStatuses),
      supabaseAdmin
        .from('bookings')
        .select('id, start_time, status, service_type, team_member_id, clients(name, address), team_members!bookings_team_member_id_fkey(name)')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfMonth)
        .lte('start_time', endOfMonth)
        .in('status', doneStatuses),
      supabaseAdmin
        .from('bookings')
        .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfYear)
        .lte('start_time', endOfYear)
        .order('start_time'),
      supabaseAdmin
        .from('bookings')
        .select('price, payment_status, partial_payment_cents')
        .eq('tenant_id', tenantId)
        .in('status', ['completed', 'paid'])
        .in('payment_status', ['pending', 'partial']),
      supabaseAdmin
        .from('bookings')
        .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfDay)
        .lt('start_time', fourteenDaysOut)
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
        .gte('created_at', startOfMonthForClientsCreatedAt.toISOString()),
      supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['completed', 'paid'])
        .gte('start_time', thirtyDaysAgo.toISOString()),
      supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', liveStatuses)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfYear),
      supabaseAdmin
        .from('bookings')
        .select('price, payment_status, partial_payment_cents')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfDay)
        .lt('start_time', endOfDay)
        .in('status', ['completed', 'paid'])
        .in('payment_status', ['paid', 'partial']),
      supabaseAdmin
        .from('bookings')
        .select('price, payment_status, partial_payment_cents')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfWeek)
        .lt('start_time', endOfWeek)
        .in('status', ['completed', 'paid'])
        .in('payment_status', ['paid', 'partial']),
      supabaseAdmin
        .from('bookings')
        .select('price, payment_status, partial_payment_cents')
        .eq('tenant_id', tenantId)
        .gte('start_time', startOfMonth)
        .lte('start_time', endOfMonth)
        .in('status', ['completed', 'paid'])
        .in('payment_status', ['paid', 'partial']),
      supabaseAdmin
        .from('team_members')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('name'),
    ])

    // A 'partial' booking already collected partial_payment_cents from the
    // client -- counting the full price as "revenue collected" (or the full
    // price as still "pending") ignores what's already landed vs. still
    // owed. Same class as the ar-aging/cash-flow/finance-summary fix this
    // session.
    const partialReceived = (b: BookingRow) =>
      Math.max(0, Math.round(Number(b.partial_payment_cents) || 0))
    const calcRevenue = (jobs: BookingRow[] | null) =>
      (jobs || []).reduce(
        (sum, b) => sum + (b.payment_status === 'partial' ? partialReceived(b) : (b.price || 0)),
        0,
      )
    const calcPendingBalance = (jobs: BookingRow[] | null) =>
      (jobs || []).reduce(
        (sum, b) =>
          sum + (b.payment_status === 'partial' ? Math.max(0, (b.price || 0) - partialReceived(b)) : (b.price || 0)),
        0,
      )

    const normalizeMapJobs = (jobs: BookingRow[] | null) =>
      (jobs || []).map(j => ({
        ...j,
        status: j.status === 'confirmed' ? 'scheduled' : j.status,
      }))

    return NextResponse.json({
      todayJobs: stripJoinedTeamMemberPins(todayRes.data),
      upcomingBookings: stripJoinedTeamMemberPins(upcomingRes.data),
      allJobs: stripJoinedTeamMemberPins(allJobsRes.data),
      mapJobs: {
        today: normalizeMapJobs(mapTodayRes.data as BookingRow[] | null),
        week: normalizeMapJobs(mapWeekRes.data as BookingRow[] | null),
        month: normalizeMapJobs(mapMonthRes.data as BookingRow[] | null),
      },
      financials: canViewFinance
        ? {
            today: { revenue: calcRevenue(todayPaidRes.data as BookingRow[] | null), jobs: todayPaidRes.data?.length || 0 },
            week: { revenue: calcRevenue(weekPaidRes.data as BookingRow[] | null), jobs: weekPaidRes.data?.length || 0 },
            month: { revenue: calcRevenue(monthPaidRes.data as BookingRow[] | null), jobs: monthPaidRes.data?.length || 0 },
            pending: { revenue: calcPendingBalance(pendingPaymentRes.data as BookingRow[] | null), jobs: pendingPaymentRes.data?.length || 0 },
          }
        : null,
      clients: {
        total: allClientsRes.count || 0,
        newThisMonth: recentClientsRes.data?.length || 0,
      },
      stats: {
        scheduled: scheduledAllRes.count || 0,
        completed: completedRecentRes.count || 0,
        pending_payment: canViewFinance ? (pendingPaymentRes.data?.length || 0) : null,
      },
      teamMembers: canViewTeam ? (teamListRes.data || []) : null,
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/dashboard error:', err)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
