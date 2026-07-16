/**
 * Team-member double-booking check, shared by every path that assigns a team
 * member to a time slot. Originally lived only inline in POST /api/bookings;
 * extracted so job-session scheduling (POST/PATCH /api/jobs/[id]/sessions)
 * can enforce the identical rule instead of silently bypassing it.
 */
import { supabaseAdmin } from '@/lib/supabase'

export interface SchedulingConflict {
  id: string
  start: string | null
  end: string | null
}

/**
 * Find other active bookings for this team member that overlap
 * [startTime, endTime], expanded by `bufferMinutes` on each side.
 * `excludeBookingId` omits the booking being edited from its own check.
 */
export async function findSchedulingConflicts(
  tenantId: string,
  teamMemberId: string,
  startTime: string,
  endTime: string,
  bufferMinutes: number,
  excludeBookingId?: string,
): Promise<SchedulingConflict[]> {
  const bufferMs = Math.max(0, bufferMinutes) * 60_000
  const startWithBuffer = new Date(new Date(startTime).getTime() - bufferMs).toISOString()
  const endWithBuffer = new Date(new Date(endTime).getTime() + bufferMs).toISOString()

  let query = supabaseAdmin
    .from('bookings')
    .select('id, start_time, end_time')
    .eq('tenant_id', tenantId)
    .eq('team_member_id', teamMemberId)
    .not('status', 'in', '("cancelled","no_show")')
    .lt('start_time', endWithBuffer)
    .gt('end_time', startWithBuffer)
  if (excludeBookingId) query = query.neq('id', excludeBookingId)

  const { data } = await query
  return (data || []).map((c) => ({ id: c.id as string, start: c.start_time as string | null, end: c.end_time as string | null }))
}
