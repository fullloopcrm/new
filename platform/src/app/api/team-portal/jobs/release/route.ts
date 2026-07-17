import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { audit } from '@/lib/audit'

// A member hands their OWN job back to the open pool (e.g. sick that morning).
// Distinct from reassign — no permission over others, only over your own job.
export async function POST(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'jobs.release_own')
  if (permError) return permError

  const { booking_id } = await request.json().catch(() => ({}))
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  // Atomic: only succeeds if this booking is currently assigned to THIS member
  // AND hasn't been checked in yet. Releasing an already-checked-in job would
  // hand it to a new assignee with check_in_time still set from THIS member --
  // checkin/route.ts rejects ANY existing check_in_time with "Already checked
  // in", regardless of who set it, so the new assignee would be permanently
  // unable to check themselves in. A job already underway needs an admin
  // handoff (bookings/[id]/reset already clears check_in_time for exactly this),
  // not a self-serve release.
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ team_member_id: null, status: 'scheduled' })
    .eq('id', booking_id)
    .eq('tenant_id', auth.tid)
    .eq('team_member_id', auth.id)
    .is('check_in_time', null)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) {
    const { data: existing } = await supabaseAdmin
      .from('bookings')
      .select('check_in_time')
      .eq('id', booking_id)
      .eq('tenant_id', auth.tid)
      .eq('team_member_id', auth.id)
      .maybeSingle()
    if (existing?.check_in_time) {
      return NextResponse.json({ error: 'This job is already checked in — contact your manager to hand it off.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Not your job to release' }, { status: 403 })
  }

  await audit({
    tenantId: auth.tid,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: { event: 'released', by: auth.id },
  })

  return NextResponse.json({ booking: data })
}
