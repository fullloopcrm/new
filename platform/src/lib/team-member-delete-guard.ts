/**
 * Guard against hard-deleting a team member who has real financial or HR
 * compliance history attached. Two live doors delete team_members rows
 * (DELETE /api/team/[id], DELETE /api/cleaners/[id]), and neither checked
 * this before calling it: payroll_payments, hr_documents, hr_notes, and
 * hr_employee_profiles all carry ON DELETE CASCADE to team_members
 * (migrations 008, 053) — a hard delete silently destroys real paid-payroll
 * records and filed compliance documents/write-ups with no trace, no
 * confirmation, no way back. team_member_payouts has no cascade (NO ACTION),
 * so it would 500 with a raw FK-violation error instead of cascading — still
 * worth catching cleanly here rather than leaking a Postgres error to the
 * client.
 *
 * hr_employee_profiles is auto-seeded for every team member at HR-default
 * values (employment_type: contractor_1099, comp_type: per_job, hr_status:
 * active) — its mere existence can't gate deletion or hard-delete would be
 * impossible for anyone. Only block when the profile carries data an admin
 * actually entered (hire/termination date, title, department, pay rate,
 * emergency contact, DOB, or a non-default hr_status).
 *
 * booking_team_members.team_member_id also carries ON DELETE CASCADE
 * (migration 2026_05_19_ratings_team_bookings) and NEITHER delete route
 * touches that table before deleting — unlike bookings.team_member_id
 * (the lead slot), which cleaners/[id] nulls out first and team/[id] is
 * protected from by a plain FK (NO ACTION, so it 500s instead of
 * cascading). A team member with zero payroll/payout history yet (a new
 * hire, or a per-job contractor not yet paid for an UPCOMING job) can be
 * assigned as a non-lead extra on a multi-tech booking via
 * booking_team_members with none of the above checks tripping. Deleting
 * them cascades that row away silently: the booking's crew count quietly
 * drops by one with no error, no notification, and (per this session's
 * other booking_team_members findings) breaks that booking's payout
 * attribution and smart-schedule conflict detection for the *other* crew
 * still assigned. Block deletion whenever booking_team_members has a row
 * for this member on a booking that hasn't reached a terminal status yet.
 *
 * team_members.status already has an 'inactive' value used exactly for this
 * ("remove from the roster, keep the record") — this guard steers callers
 * there instead of guessing a new soft-delete mechanism.
 */
import { supabaseAdmin } from '@/lib/supabase'

// bookings.status enum per supabase/schema.sql; every value here still has
// live crew-assignment consequences. 'completed' and 'cancelled' are the
// only terminal statuses.
const ACTIVE_BOOKING_STATUSES = ['pending', 'scheduled', 'in_progress', 'available']

export interface DeleteGuardResult {
  deletable: boolean
  reason?: string
}

function hasRealProfileData(profile: {
  hire_date: string | null
  termination_date: string | null
  title: string | null
  department: string | null
  pay_rate_cents: number | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  date_of_birth: string | null
  hr_status: string
} | null): boolean {
  if (!profile) return false
  return (
    profile.hire_date != null ||
    profile.termination_date != null ||
    profile.title != null ||
    profile.department != null ||
    profile.pay_rate_cents != null ||
    profile.emergency_contact_name != null ||
    profile.emergency_contact_phone != null ||
    profile.date_of_birth != null ||
    profile.hr_status !== 'active'
  )
}

export async function checkTeamMemberDeletable(
  tenantId: string,
  teamMemberId: string,
): Promise<DeleteGuardResult> {
  const [payroll, payouts, docs, notes, profile, crewRows] = await Promise.all([
    supabaseAdmin.from('payroll_payments').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('team_member_id', teamMemberId),
    supabaseAdmin.from('team_member_payouts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('team_member_id', teamMemberId),
    supabaseAdmin.from('hr_documents').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('team_member_id', teamMemberId),
    supabaseAdmin.from('hr_notes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('team_member_id', teamMemberId),
    supabaseAdmin.from('hr_employee_profiles').select('hire_date, termination_date, title, department, pay_rate_cents, emergency_contact_name, emergency_contact_phone, date_of_birth, hr_status').eq('tenant_id', tenantId).eq('team_member_id', teamMemberId).maybeSingle(),
    supabaseAdmin.from('booking_team_members').select('booking_id').eq('tenant_id', tenantId).eq('team_member_id', teamMemberId),
  ])

  if ((payroll.count || 0) > 0 || (payouts.count || 0) > 0) {
    return {
      deletable: false,
      reason: 'This team member has payroll or payout history and cannot be deleted — set status to inactive instead to preserve the financial record.',
    }
  }
  if ((docs.count || 0) > 0 || (notes.count || 0) > 0) {
    return {
      deletable: false,
      reason: 'This team member has HR documents or notes on file and cannot be deleted — set status to inactive instead to preserve the compliance record.',
    }
  }
  if (hasRealProfileData(profile.data)) {
    return {
      deletable: false,
      reason: 'This team member has HR profile data on file (hire date, pay rate, emergency contact, etc.) and cannot be deleted — set status to inactive instead to preserve the record.',
    }
  }

  const bookingIds = ((crewRows.data as { booking_id: string }[] | null) ?? []).map((r) => r.booking_id)
  if (bookingIds.length > 0) {
    const activeAssignments = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('id', bookingIds)
      .in('status', ACTIVE_BOOKING_STATUSES)
    if ((activeAssignments.count || 0) > 0) {
      return {
        deletable: false,
        reason: 'This team member is assigned as crew on an active booking and cannot be deleted — set status to inactive instead, or unassign them from the booking first.',
      }
    }
  }

  return { deletable: true }
}
