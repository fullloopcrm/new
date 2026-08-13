// bsr-02 (upgraded 2026-08-01 from flag-only, commit f8431cc6e, per Jeff's
// explicit decision): deactivating a team member used to only flag their
// still-future bookings in `schedule_issues` for a human to manually
// reassign. This upgrades that to REAL auto-reassignment: for every future,
// non-terminal-status booking the deactivated member is on (as primary lead
// via bookings.team_member_id, or as crew via booking_team_members), try to
// find another active, same-tenant, actually-available replacement using the
// exact same availability/zone/car/conflict engine normal booking creation
// and the recurring-generation cron already use (scoreTeamForBooking /
// pickBestTeam, src/lib/smart-schedule.ts) -- not a naive round-robin, and
// not a second scoring implementation that could drift from the real one.
//
// Two-tier fallback, deliberately: if a real candidate exists, reassign
// immediately (write + audit + best-effort push notification to the new
// assignee). If NO candidate is available for a given booking -- nobody
// active, everybody conflicted/off/out-of-zone/car-blocked that day -- this
// falls back to exactly what f8431cc6e already built: a critical
// schedule_issues row so a human sees it in the existing Schedule Issues
// panel. Never crashes, never silently drops a booking.
//
// Tenant isolation: scoreTeamForBooking's own team_members query is
// `.eq('tenant_id', tenantId)`, so a candidate can never come from a
// different tenant even if two tenants have identically-named/scheduled
// team members. Every write in this file is also tenant-scoped directly
// (`.eq('tenant_id', tenantId)`) as defense in depth.
import { supabaseAdmin } from '@/lib/supabase'
import { scoreTeamForBooking, pickBestTeam, type TeamMemberScore } from '@/lib/smart-schedule'
import { getTenantTimezone, toTenantNaiveString } from '@/lib/tenant-time'
import { audit } from '@/lib/audit'
import { sendPushToTeamMember } from '@/lib/push'

const FUTURE_BOOKING_STATUSES = ['scheduled', 'pending', 'confirmed']

type ClientInfo = { name?: string | null; address?: string | null; latitude?: number | string | null; longitude?: number | string | null } | null

interface AffectedBooking {
  id: string
  start_time: string
  end_time: string | null
  client_id: string | null
  hourly_rate: number | null
  leadId: string | null // current bookings.team_member_id at read time
  clients: ClientInfo
  role: 'primary' | 'crew'
}

export interface ReassignmentOutcome {
  totalAffected: number
  reassigned: number
  flaggedForReview: number
}

/** Finds every still-future, non-terminal-status booking the member is on. */
async function findAffectedBookings(tenantId: string, teamMemberId: string, nowNaive: string): Promise<AffectedBooking[]> {
  type Row = {
    id: string; start_time: string; end_time: string | null; client_id: string | null
    hourly_rate: number | null; team_member_id: string | null; clients: ClientInfo
  }
  const cols = 'id, start_time, end_time, client_id, hourly_rate, team_member_id, clients(name, address, latitude, longitude)'

  const { data: primaryRows } = (await supabaseAdmin
    .from('bookings')
    .select(cols)
    .eq('tenant_id', tenantId)
    .eq('team_member_id', teamMemberId)
    .in('status', FUTURE_BOOKING_STATUSES)
    .gte('start_time', nowNaive)
    .limit(500)) as { data: Row[] | null }

  const { data: crewLinks } = await supabaseAdmin
    .from('booking_team_members')
    .select('booking_id')
    .eq('tenant_id', tenantId)
    .eq('team_member_id', teamMemberId)
    .limit(500)
  const crewBookingIds = (crewLinks || []).map((r) => r.booking_id as string).filter(Boolean)

  let crewRows: Row[] = []
  if (crewBookingIds.length > 0) {
    const { data } = (await supabaseAdmin
      .from('bookings')
      .select(cols)
      .eq('tenant_id', tenantId)
      .in('id', crewBookingIds)
      .in('status', FUTURE_BOOKING_STATUSES)
      .gte('start_time', nowNaive)
      .limit(500)) as { data: Row[] | null }
    crewRows = data || []
  }

  const seen = new Set<string>()
  const affected: AffectedBooking[] = []
  for (const b of primaryRows || []) {
    if (seen.has(b.id)) continue
    seen.add(b.id)
    affected.push({ id: b.id, start_time: b.start_time, end_time: b.end_time, client_id: b.client_id, hourly_rate: b.hourly_rate, leadId: b.team_member_id, clients: b.clients, role: 'primary' })
  }
  for (const b of crewRows) {
    if (seen.has(b.id)) continue
    seen.add(b.id)
    affected.push({ id: b.id, start_time: b.start_time, end_time: b.end_time, client_id: b.client_id, hourly_rate: b.hourly_rate, leadId: b.team_member_id, clients: b.clients, role: 'crew' })
  }
  return affected
}

/**
 * Score real candidates for this booking's actual slot and return the best
 * available one, excluding the deactivated member and anyone already on the
 * booking (lead or crew) -- reassigning to someone already working the job
 * isn't a reassignment. Never throws (scoreTeamForBooking already never
 * geocodes-and-fails hard; a candidate lookup failure should fall back to
 * flagging, not crash the deactivation).
 */
async function findReplacementCandidate(tenantId: string, deactivatedMemberId: string, booking: AffectedBooking): Promise<TeamMemberScore | null> {
  try {
    const dateStr = String(booking.start_time).slice(0, 10)
    const startTime = String(booking.start_time).slice(11, 16)
    const durationHours = booking.end_time
      ? Math.max(0.5, (Date.parse(booking.end_time) - Date.parse(booking.start_time)) / 3_600_000)
      : 2

    const { data: crewRows } = await supabaseAdmin
      .from('booking_team_members')
      .select('team_member_id')
      .eq('tenant_id', tenantId)
      .eq('booking_id', booking.id)
    const alreadyOn = new Set<string>([
      deactivatedMemberId,
      ...(booking.leadId ? [booking.leadId] : []),
      ...(crewRows || []).map((r) => r.team_member_id as string),
    ])

    const scores = await scoreTeamForBooking({
      tenantId,
      date: dateStr,
      startTime,
      durationHours,
      clientAddress: booking.clients?.address || '',
      clientId: booking.client_id || undefined,
      excludeBookingId: booking.id,
      hourlyRate: booking.hourly_rate ?? undefined,
    })

    const candidates = scores.filter((s) => s.available && !alreadyOn.has(s.id))
    return pickBestTeam(candidates, 1).lead
  } catch (e) {
    console.error('[bsr-02] findReplacementCandidate failed, will fall back to flagging:', e)
    return null
  }
}

async function reassignPrimary(tenantId: string, booking: AffectedBooking, newMemberId: string): Promise<boolean> {
  const { data: target } = await supabaseAdmin
    .from('team_members')
    .select('pay_rate')
    .eq('id', newMemberId)
    .eq('tenant_id', tenantId)
    .single()

  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ team_member_id: newMemberId, pay_rate: (target?.pay_rate as number | null | undefined) ?? null })
    .eq('id', booking.id)
    .eq('tenant_id', tenantId)

  return !error
}

async function reassignCrew(tenantId: string, booking: AffectedBooking, oldMemberId: string, newMemberId: string): Promise<boolean> {
  const { data: oldRow } = await supabaseAdmin
    .from('booking_team_members')
    .select('is_lead, position')
    .eq('tenant_id', tenantId)
    .eq('booking_id', booking.id)
    .eq('team_member_id', oldMemberId)
    .maybeSingle()

  const { error: delErr } = await supabaseAdmin
    .from('booking_team_members')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('booking_id', booking.id)
    .eq('team_member_id', oldMemberId)
  if (delErr) return false

  const { error: insErr } = await supabaseAdmin
    .from('booking_team_members')
    .insert({
      tenant_id: tenantId,
      booking_id: booking.id,
      team_member_id: newMemberId,
      is_lead: (oldRow as { is_lead?: boolean } | null)?.is_lead ?? false,
      position: (oldRow as { position?: number } | null)?.position ?? null,
    })
  return !insErr
}

/** Best-effort — a notification failure must never affect the reassignment result. */
async function notifyReassignment(booking: AffectedBooking, chosen: TeamMemberScore): Promise<void> {
  try {
    const when = booking.start_time ? new Date(booking.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
    await sendPushToTeamMember(chosen.id, 'New job assigned', `You've been auto-assigned a job${when ? ` on ${when}` : ''} after a teammate was deactivated.`, '/team/jobs')
  } catch (e) {
    console.error('[bsr-02] reassignment push notify failed (non-fatal):', e)
  }
}

/**
 * Bookings that couldn't be auto-reassigned fall back to the original
 * f8431cc6e behavior: a critical schedule_issues row, idempotent (won't
 * double-insert if one's already open for that booking).
 */
async function flagBookings(tenantId: string, teamMemberId: string, memberName: string, toFlag: AffectedBooking[]): Promise<number> {
  if (toFlag.length === 0) return 0

  const { data: existingIssues } = await supabaseAdmin
    .from('schedule_issues')
    .select('booking_id')
    .eq('tenant_id', tenantId)
    .eq('type', 'inactive_member_assigned')
    .in('status', ['open', 'acknowledged'])
    .in('booking_id', toFlag.map((b) => b.id))
  const alreadyFlagged = new Set((existingIssues || []).map((i) => i.booking_id))

  const toInsert = toFlag
    .filter((b) => !alreadyFlagged.has(b.id))
    .map((b) => ({
      tenant_id: tenantId,
      type: 'inactive_member_assigned',
      severity: 'critical' as const,
      message: `${memberName} was deactivated but is still assigned to ${b.clients?.name || 'a client'} on ${String(b.start_time).slice(0, 10)} — no available replacement was found automatically, reassign this booking`,
      booking_id: b.id,
      booking_ids: [b.id],
      team_member_id: teamMemberId,
      date: String(b.start_time).slice(0, 10),
      status: 'open',
    }))

  if (toInsert.length > 0) {
    await supabaseAdmin.from('schedule_issues').insert(toInsert)
  }

  return toFlag.length
}

/**
 * On deactivation: try to auto-reassign every still-future booking the
 * member is on to a real available replacement; anything that can't be
 * auto-reassigned gets flagged for human review instead. Processed
 * sequentially (not Promise.all) so each write lands before the next
 * booking's candidate scoring runs -- otherwise two affected bookings on the
 * same day could both "see" the same replacement as free and double-book them.
 */
export async function reassignOrFlagFutureBookings(tenantId: string, teamMemberId: string, memberName: string): Promise<ReassignmentOutcome> {
  const { data: tenantRow } = await supabaseAdmin.from('tenants').select('timezone').eq('id', tenantId).single()
  const timezone = getTenantTimezone(tenantRow)
  const nowNaive = toTenantNaiveString(timezone)

  const affected = await findAffectedBookings(tenantId, teamMemberId, nowNaive)
  if (affected.length === 0) return { totalAffected: 0, reassigned: 0, flaggedForReview: 0 }

  let reassigned = 0
  const toFlag: AffectedBooking[] = []

  for (const booking of affected) {
    const chosen = await findReplacementCandidate(tenantId, teamMemberId, booking)
    if (!chosen) {
      toFlag.push(booking)
      continue
    }

    const ok = booking.role === 'primary'
      ? await reassignPrimary(tenantId, booking, chosen.id)
      : await reassignCrew(tenantId, booking, teamMemberId, chosen.id)

    if (!ok) {
      toFlag.push(booking)
      continue
    }

    reassigned += 1
    await audit({
      tenantId,
      action: 'booking.updated',
      entityType: 'booking',
      entityId: booking.id,
      details: { event: 'auto_reassigned_on_deactivation', from: teamMemberId, from_name: memberName, to: chosen.id, to_name: chosen.name, role: booking.role },
    })
    void notifyReassignment(booking, chosen)
  }

  const flaggedForReview = await flagBookings(tenantId, teamMemberId, memberName, toFlag)

  return { totalAffected: affected.length, reassigned, flaggedForReview }
}
