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

  // Atomic: only succeeds if this booking is currently assigned to THIS member.
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ team_member_id: null, status: 'scheduled' })
    .eq('id', booking_id)
    .eq('tenant_id', auth.tid)
    .eq('team_member_id', auth.id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not your job to release' }, { status: 403 })

  // GET /api/bookings/:id/team and closeout-summary both source the LEAD
  // from booking_team_members, not bookings.team_member_id -- releasing a
  // job nulled the latter but left the stale lead row (still pointing at
  // the member who just released it) behind. Same booking_team_members-sync
  // gap already fixed across every other team_member_id write site this
  // session.
  await supabaseAdmin.from('booking_team_members').delete().eq('booking_id', booking_id).eq('is_lead', true)

  await audit({
    tenantId: auth.tid,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: { event: 'released', by: auth.id },
  })

  return NextResponse.json({ booking: data })
}
