// Smart-scheduling upgrade spec, Part 4 item 1: per-cleaner recurring
// retention. % of clients ever assigned to this member (currently active,
// or lapsed via cancellation) that are still active vs cancelled.
//
// "Ever assigned" is approximate by design (documented limitation, not a
// bug): a schedule that was reassigned away from this member while still
// active has no history trail today — only the CURRENT team_member_id (for
// active rows) and the CANCELLATION-TIME snapshot (for cancelled rows, see
// migrations/2026_07_28_recurring_schedule_cancellation_attribution.sql)
// are available. A member who held a client for months and was swapped off
// shortly before it lapsed won't show that churn against them. Building a
// full assignment-history table to close that gap is future work, not part
// of this first version — matches the spec's own "no new tracking needed
// to get the first version live" framing for this item.
//
// 'paused' schedules count as still-retained, not lapsed — a pause is a
// client-initiated hold, not churn. (Unused in prod data as of this
// writing — 0 rows — but the column/status is supported by the app.)
import { supabaseAdmin } from '@/lib/supabase'

export interface RetentionStats {
  ever_assigned: number
  still_active: number
  lapsed: number
  // null (not 0) when there's no history yet — absence of data isn't a bad score.
  retention_rate: number | null
}

export async function getTeamMemberRetentionStats(
  tenantId: string,
  teamMemberId: string,
): Promise<RetentionStats> {
  const [{ data: activeRows }, { data: cancelledOwn }, { data: cancelledLegacy }] = await Promise.all([
    // Currently assigned + still active/paused.
    supabaseAdmin
      .from('recurring_schedules')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('team_member_id', teamMemberId)
      .in('status', ['active', 'paused']),
    // Cancelled with an explicit cancellation-time snapshot naming this member.
    supabaseAdmin
      .from('recurring_schedules')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'cancelled')
      .eq('cancelled_team_member_id', teamMemberId),
    // Cancelled before the snapshot column existed (or cancelled through a
    // path that predates this migration) — fall back to the live column,
    // which is only correct when it was never reassigned/unassigned after
    // the fact. Kept separate from the query above (not an .or()) to avoid
    // building a raw PostgREST filter string out of a caller-supplied id.
    supabaseAdmin
      .from('recurring_schedules')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'cancelled')
      .is('cancelled_team_member_id', null)
      .eq('team_member_id', teamMemberId),
  ])

  const stillActive = (activeRows || []).length
  const lapsed = (cancelledOwn || []).length + (cancelledLegacy || []).length
  const everAssigned = stillActive + lapsed

  return {
    ever_assigned: everAssigned,
    still_active: stillActive,
    lapsed,
    retention_rate: everAssigned > 0 ? Math.round((stillActive / everAssigned) * 1000) / 10 : null,
  }
}
