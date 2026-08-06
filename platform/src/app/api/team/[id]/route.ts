import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission, overridesFor } from '@/lib/require-permission'
import { hasPermission } from '@/lib/rbac'
import { supabaseAdmin } from '@/lib/supabase'
import { pick } from '@/lib/validate'
import { audit } from '@/lib/audit'
import { etDayBoundaryUTC, etToday } from '@/lib/recurring'
import { getTeamMemberRetentionStats } from '@/lib/team-retention'
import { getTeamMemberRatingTrend } from '@/lib/team-rating-trend'
import { reassignOrFlagFutureBookings } from '@/lib/team-deactivation-reassign'
import { decryptSecret, encryptSecretSafe } from '@/lib/secret-crypto'
import { generateUniqueTeamPin, notifyTeamMemberPin } from '@/lib/team-provisioning'
import { tenantSiteUrl } from '@/lib/tenant-site'

// decryptSecret() throws on a malformed/corrupted envelope (bad auth tag,
// truncated ciphertext, wrong/rotated SECRET_ENCRYPTION_KEY). Guard so one
// bad row doesn't 500 the whole profile page — same tolerance as
// findRowByPin's scan fallback in lib/pin-lookup.ts.
function safeDecryptPin(pin: string | null): string | null {
  if (!pin) return pin
  try {
    return decryptSecret(pin)
  } catch {
    return null
  }
}

const COMPENSATION_FIELDS = ['pay_rate', 'hourly_rate', 'employment_type'] as const

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('team.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
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
    const canSeeCompensation = hasPermission(tenant.role, 'team.compensation', overridesFor(tenant))

    // The PIN is the cleaner's team-portal credential — same sensitivity
    // tier as pay/employment data, gated the same way (team.compensation),
    // not just plain team.view/team.edit.
    const member: Record<string, unknown> = { ...data, pin: canSeeCompensation ? safeDecryptPin(data.pin) : undefined }
    if (!canSeeCompensation) {
      for (const f of COMPENSATION_FIELDS) delete member[f]
    }

    return NextResponse.json({
      member,
      stats: {
        jobs_completed: jobsCompleted || 0,
        no_show_count: noShowCount || 0,
        avg_rating: data.avg_rating != null ? Number(data.avg_rating) : null,
        rating_count: data.rating_count || 0,
        ytd_earnings_cents: canSeeCompensation ? ytdEarningsCents : null,
        lifetime_earnings_cents: canSeeCompensation ? lifetimeEarningsCents : null,
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

    if (body.regenerate_pin) {
      // Same tier as viewing it — resetting a cleaner's team-portal
      // credential is sensitive access-control, not a roster edit.
      if (!hasPermission(tenant.role, 'team.compensation', overridesFor(tenant))) {
        return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
      }

      const { data: member } = await supabaseAdmin
        .from('team_members')
        .select('id, name, email, phone')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()
      if (!member) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      if (!member.email && !member.phone) {
        return NextResponse.json({ error: 'Team member has no email or phone on file' }, { status: 400 })
      }

      const newPin = await generateUniqueTeamPin(tenantId, id)
      const { error: updateError } = await supabaseAdmin
        .from('team_members')
        .update({ pin: encryptSecretSafe(newPin) })
        .eq('id', id)
        .eq('tenant_id', tenantId)
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

      const { emailed, texted } = await notifyTeamMemberPin({
        tenantId,
        memberId: id,
        memberName: member.name,
        pin: newPin,
        portalUrl: `${tenantSiteUrl(tenant.tenant)}/team/login`,
        wasReset: true,
      })
      await audit({ tenantId, action: 'team.updated', entityType: 'team_member', entityId: id, details: { field: 'pin_regenerated' } })

      return NextResponse.json({ success: true, pin: newPin, emailed, texted })
    }

    const fields = pick(body, [
      'name', 'email', 'phone', 'role', 'hourly_rate', 'pay_rate', 'working_days', 'status',
      'preferred_language', 'notes', 'avatar_url', 'address', 'schedule', 'home_by_time',
      'has_car', 'labor_only', 'service_zones', 'max_travel_minutes',
    ])

    if (!hasPermission(tenant.role, 'team.compensation', overridesFor(tenant))) {
      for (const f of COMPENSATION_FIELDS) delete (fields as Record<string, unknown>)[f]
    }

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
    // Now tries real auto-reassignment first, flags for human review only
    // when no available replacement exists. See reassignOrFlagFutureBookings.
    let futureBookingsReassigned = 0
    let futureBookingsFlagged = 0
    if (fields.status === 'inactive') {
      const outcome = await reassignOrFlagFutureBookings(tenantId, id, data.name)
      futureBookingsReassigned = outcome.reassigned
      futureBookingsFlagged = outcome.flaggedForReview
    }

    return NextResponse.json({ member: data, future_bookings_reassigned: futureBookingsReassigned, future_bookings_flagged: futureBookingsFlagged })
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
      // crew) and try to auto-reassign it to a real available replacement;
      // anything with no available replacement falls back to a schedule_issues
      // flag for human review, same as before. See reassignOrFlagFutureBookings.
      const { reassigned: futureBookingsReassigned, flaggedForReview: futureBookingsFlagged } =
        await reassignOrFlagFutureBookings(tenantId, id, data.name)

      await audit({
        tenantId,
        action: 'team.deactivated',
        entityType: 'team_member',
        entityId: id,
        details: {
          reason: 'has_booking_history', booking_count: bookingCount, crew_count: crewCount,
          future_bookings_reassigned: futureBookingsReassigned, future_bookings_flagged: futureBookingsFlagged,
        },
      })

      return NextResponse.json({
        success: true, deactivated: true, member: data,
        future_bookings_reassigned: futureBookingsReassigned, future_bookings_flagged: futureBookingsFlagged,
      })
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
