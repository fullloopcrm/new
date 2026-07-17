import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { audit } from '@/lib/audit'

// A member hands their OWN job back to the open pool (e.g. sick that morning).
// Distinct from reassign — no permission over others, only over your own job.
export async function POST(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'jobs.release_own')
  if (permError) return permError

  const { booking_id } = await request.json().catch(() => ({}))
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  // Atomic: only succeeds if this booking is currently assigned to THIS
  // member AND hasn't been started yet. Without the status filter, a member
  // could "release" a job they already checked into (or completed) — the
  // update forces status back to 'scheduled' but leaves check_in_time/
  // check_out_time/actual_hours/team_member_pay from the real session on the
  // row, and the now-unassigned booking reappears in the open pool for
  // someone else to claim over a job that already happened. Same class as
  // the reassign guard on the sibling route.
  const { data, error } = await tenantDb(auth.tid)
    .from('bookings')
    .update({ team_member_id: null, status: 'scheduled' })
    .eq('id', booking_id)
    .eq('team_member_id', auth.id)
    .in('status', ['scheduled', 'confirmed'])
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not your job to release, or it has already started' }, { status: 403 })

  await audit({
    tenantId: auth.tid,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: { event: 'released', by: auth.id },
  })

  return NextResponse.json({ booking: data })
}
