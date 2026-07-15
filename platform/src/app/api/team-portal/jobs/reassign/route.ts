import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePortalPermission, scopedMemberIds } from '@/lib/team-portal-auth'
import { sendPushToTeamMember } from '@/lib/push'
import { audit } from '@/lib/audit'

// A lead/manager reassigns a job to another field member. Guardrails:
//   - requires jobs.reassign
//   - the target must be inside the actor's scope (their pod / all for manager)
//   - the previously-assigned member AND the new one are notified + it's audited
export async function POST(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'jobs.reassign')
  if (permError) return permError

  const { booking_id, to_member_id } = await request.json().catch(() => ({}))
  if (!booking_id || !to_member_id) {
    return NextResponse.json({ error: 'booking_id and to_member_id required' }, { status: 400 })
  }

  // The target must be someone this actor is allowed to manage.
  const scope = await scopedMemberIds(auth)
  if (!scope.includes(to_member_id)) {
    return NextResponse.json({ error: 'That member is not in your crew' }, { status: 403 })
  }

  // Fetch the booking (tenant-scoped) so we know who currently holds it.
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, team_member_id, start_time, clients(name)')
    .eq('id', booking_id)
    .eq('tenant_id', auth.tid)
    .single()
  if (!booking) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // The source booking must also be in the actor's scope — otherwise a lead
  // could hijack jobs already assigned to (or intended for) another crew.
  if (booking.team_member_id && !scope.includes(booking.team_member_id)) {
    return NextResponse.json({ error: 'That job is not in your crew' }, { status: 403 })
  }

  const previous = booking.team_member_id

  const { data: target } = await supabaseAdmin
    .from('team_members')
    .select('pay_rate')
    .eq('id', to_member_id)
    .eq('tenant_id', auth.tid)
    .single()
  if (!target) return NextResponse.json({ error: 'Target member not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({
      team_member_id: to_member_id,
      pay_rate: target.pay_rate || null,
      status: 'confirmed',
      check_in_time: null,
      check_out_time: null,
      check_in_lat: null,
      check_in_lng: null,
      check_out_lat: null,
      check_out_lng: null,
      actual_hours: null,
    })
    .eq('id', booking_id)
    .eq('tenant_id', auth.tid)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Reassign failed' }, { status: 500 })

  await audit({
    tenantId: auth.tid,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: { event: 'reassigned', by: auth.id, from: previous, to: to_member_id },
  })

  // Notify both sides — accountability so no one silently loses/gains a job.
  const when = booking.start_time ? new Date(booking.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  try {
    await sendPushToTeamMember(to_member_id, 'New job assigned', `You've been assigned a job${when ? ` on ${when}` : ''}.`, '/team/jobs')
    if (previous && previous !== to_member_id) {
      await sendPushToTeamMember(previous, 'Job reassigned', `A job${when ? ` on ${when}` : ''} was moved to a teammate.`, '/team/jobs')
    }
  } catch (e) {
    console.error('[reassign] push failed (non-fatal):', e)
  }

  return NextResponse.json({ booking: data })
}
