import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { pick } from '@/lib/validate'
import { audit } from '@/lib/audit'
import { etDayBoundaryUTC, etToday } from '@/lib/recurring'
import { getTeamMemberRetentionStats } from '@/lib/team-retention'
import { getTeamMemberRatingTrend } from '@/lib/team-rating-trend'
import { getTenantTimezone, toTenantNaiveString } from '@/lib/tenant-time'

const FUTURE_BOOKING_STATUSES = ['scheduled', 'pending', 'confirmed']

// bsr-02: deactivating a team member (via DELETE's soft-deactivate path, or
// PUT setting status:'inactive' directly) used to leave their future
// bookings silently pointing at an inactive member -- nothing reassigned or
// even flagged them. This finds every still-future, not-yet-happened
// booking the member is on (as the primary assignee OR as booking_team_members
// crew) and writes a critical schedule_issues row so it surfaces immediately
// in the existing Schedule Issues panel (same table/mechanism
// src/app/api/cron/schedule-monitor/route.ts already writes to) -- not
// waiting for the next hourly cron run. Auto-reassignment (silently picking
// a replacement) is deliberately NOT attempted here: picking the "right"
// replacement depends on zone/skill/day-availability/car requirements the
// same way normal booking creation does, and guessing wrong would silently
// create a different bad booking instead of a visibly-flagged one. A human
// makes the actual reassignment call from the flagged issue.
async function flagFutureBookingsForReassignment(
  tenantId: string,
  teamMemberId: string,
  memberName: string
): Promise<number> {
  const { data: tenantRow } = await supabaseAdmin.from('tenants').select('timezone').eq('id', tenantId).single()
  const timezone = getTenantTimezone(tenantRow)
  const nowNaive = toTenantNaiveString(timezone)

  type FutureBookingRow = { id: string; start_time: string; clients: { name: string | null } | null }

  const { data: primaryBookings } = (await supabaseAdmin
    .from('bookings')
    .select('id, start_time, clients(name)')
    .eq('tenant_id', tenantId)
    .eq('team_member_id', teamMemberId)
    .in('status', FUTURE_BOOKING_STATUSES)
    .gte('start_time', nowNaive)
    .limit(500)) as { data: FutureBookingRow[] | null }

  const { data: crewLinks } = await supabaseAdmin
    .from('booking_team_members')
    .select('booking_id')
    .eq('tenant_id', tenantId)
    .eq('team_member_id', teamMemberId)
    .limit(500)
  const crewBookingIds = (crewLinks || []).map((r) => r.booking_id).filter(Boolean)

  let crewBookings: FutureBookingRow[] = []
  if (crewBookingIds.length > 0) {
    const { data } = (await supabaseAdmin
      .from('bookings')
      .select('id, start_time, clients(name)')
      .eq('tenant_id', tenantId)
      .in('id', crewBookingIds)
      .in('status', FUTURE_BOOKING_STATUSES)
      .gte('start_time', nowNaive)
      .limit(500)) as { data: FutureBookingRow[] | null }
    crewBookings = data || []
  }

  const seen = new Set<string>()
  const affected: { id: string; start_time: string; clientName: string | null }[] = []
  for (const b of [...(primaryBookings || []), ...crewBookings]) {
    if (seen.has(b.id)) continue
    seen.add(b.id)
    affected.push({ id: b.id, start_time: b.start_time, clientName: (b.clients as { name: string | null } | null)?.name || null })
  }

  if (affected.length === 0) return 0

  // Don't re-insert a duplicate flag for a booking that's already got an
  // open one -- PUT can be called repeatedly with status:'inactive'.
  const { data: existingIssues } = await supabaseAdmin
    .from('schedule_issues')
    .select('booking_id')
    .eq('tenant_id', tenantId)
    .eq('type', 'inactive_member_assigned')
    .in('status', ['open', 'acknowledged'])
    .in('booking_id', affected.map((b) => b.id))
  const alreadyFlagged = new Set((existingIssues || []).map((i) => i.booking_id))
  const toInsert = affected
    .filter((b) => !alreadyFlagged.has(b.id))
    .map((b) => ({
      tenant_id: tenantId,
      type: 'inactive_member_assigned',
      severity: 'critical' as const,
      message: `${memberName} was deactivated but is still assigned to ${b.clientName || 'a client'} on ${String(b.start_time).slice(0, 10)} — reassign this booking`,
      booking_id: b.id,
      booking_ids: [b.id],
      team_member_id: teamMemberId,
      date: String(b.start_time).slice(0, 10),
      status: 'open',
    }))

  if (toInsert.length > 0) {
    await supabaseAdmin.from('schedule_issues').insert(toInsert)
  }

  return affected.length
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // KPI stats — computed server-side via count-only queries rather than
    // from the (capped at 50) bookings list the page also fetches, so a
    // long-tenured member's lifetime totals aren't silently undercounted.
    const yearStart = etDayBoundaryUTC({ ...etToday(), month: 0, day: 1 }).toISOString()
    const [{ count: jobsCompleted }, { count: noShowCount }, { data: ytdBookings }, { data: lifetimeBookings }, retention, ratingTrend] = await Promise.all([
      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
        .eq('team_member_id', id).in('status', ['completed', 'paid']),
      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
        .eq('team_member_id', id).eq('status', 'no_show'),
      supabaseAdmin.from('bookings').select('team_member_pay')
        .eq('team_member_id', id).in('status', ['completed', 'paid']).gte('start_time', yearStart),
      supabaseAdmin.from('bookings').select('team_member_pay')
        .eq('team_member_id', id).in('status', ['completed', 'paid']),
      getTeamMemberRetentionStats(tenantId, id),
      getTeamMemberRatingTrend(tenantId, id),
    ])
    const ytdEarningsCents = (ytdBookings || []).reduce((sum, b) => sum + (b.team_member_pay || 0), 0)
    const lifetimeEarningsCents = (lifetimeBookings || []).reduce((sum, b) => sum + (b.team_member_pay || 0), 0)

    return NextResponse.json({
      member: data,
      stats: {
        jobs_completed: jobsCompleted || 0,
        no_show_count: noShowCount || 0,
        avg_rating: data.avg_rating != null ? Number(data.avg_rating) : null,
        rating_count: data.rating_count || 0,
        ytd_earnings_cents: ytdEarningsCents,
        lifetime_earnings_cents: lifetimeEarningsCents,
        // Smart-scheduling upgrade spec Part 4 item 1 — see lib/team-retention.ts
        // for what "ever_assigned" does and doesn't capture.
        retention_ever_assigned: retention.ever_assigned,
        retention_still_active: retention.still_active,
        retention_lapsed: retention.lapsed,
        retention_rate: retention.retention_rate,
        // Smart-scheduling upgrade spec Part 4 item 3 — see lib/team-rating-trend.ts.
        trend_rating_count: ratingTrend.trend_rating_count,
        trend_avg_rating: ratingTrend.trend_avg_rating,
      },
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json()
    const fields = pick(body, [
      'name', 'email', 'phone', 'role', 'hourly_rate', 'pay_rate', 'working_days', 'status',
      'preferred_language', 'notes', 'avatar_url', 'address', 'schedule', 'home_by_time',
      'has_car', 'labor_only', 'service_zones', 'max_travel_minutes',
    ])

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'team.updated', entityType: 'team_member', entityId: id })

    // bsr-02: this is a second real path to deactivation (DELETE below is
    // the other) -- a status:'inactive' PUT had zero booking-reassignment
    // logic before this fix, same gap as DELETE's soft-deactivate branch.
    let futureBookingsFlagged = 0
    if (fields.status === 'inactive') {
      futureBookingsFlagged = await flagFutureBookingsForReassignment(tenantId, id, data.name)
    }

    return NextResponse.json({ member: data, future_bookings_flagged: futureBookingsFlagged })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('team.delete')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    // A team member with any booking history (past or future) can't be hard
    // deleted — bookings.team_member_id's FK rejects it, and even if it
    // didn't, deleting the row would blow away payout/audit history tied to
    // real completed jobs. booking_team_members (crew, not lead) is WORSE:
    // its FK is ON DELETE CASCADE, so a hard delete would silently wipe a
    // former crew member's job-history rows with no error at all. Deactivate
    // instead in both cases: same practical effect (gone from the active
    // roster, unassignable to new jobs) without destroying data.
    const [{ count: bookingCount }, { count: crewCount }] = await Promise.all([
      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('team_member_id', id),
      supabaseAdmin.from('booking_team_members').select('id', { count: 'exact', head: true }).eq('team_member_id', id),
    ])

    if ((bookingCount || 0) > 0 || (crewCount || 0) > 0) {
      const { data, error } = await supabaseAdmin
        .from('team_members')
        .update({ status: 'inactive' })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // bsr-02: find every still-future booking this member is on (lead or
      // crew) and flag it in schedule_issues so it doesn't silently sit
      // assigned to someone no longer active. See flagFutureBookingsForReassignment.
      const futureBookingsFlagged = await flagFutureBookingsForReassignment(tenantId, id, data.name)

      await audit({
        tenantId,
        action: 'team.deactivated',
        entityType: 'team_member',
        entityId: id,
        details: { reason: 'has_booking_history', booking_count: bookingCount, crew_count: crewCount, future_bookings_flagged: futureBookingsFlagged },
      })

      return NextResponse.json({ success: true, deactivated: true, member: data, future_bookings_flagged: futureBookingsFlagged })
    }

    const { error } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'team.deleted', entityType: 'team_member', entityId: id })

    return NextResponse.json({ success: true, deactivated: false })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
