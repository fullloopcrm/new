import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
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

  const db = tenantDb(auth.tid)

  // Fetch the booking (tenant-scoped) so we know who currently holds it.
  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data: booking } = (await db
    .from('bookings')
    .select('id, team_member_id, start_time, clients(name)')
    .eq('id', booking_id)
    .single()) as { data: { id: string; team_member_id: string | null; start_time: string | null } | null }
  if (!booking) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const previous = booking.team_member_id

  // The booking's current holder (if any) must also be inside the actor's
  // scope — otherwise a lead could reassign a job belonging to a different
  // crew/lead by simply supplying its booking_id.
  if (previous && !scope.includes(previous)) {
    return NextResponse.json({ error: 'That job is not in your crew' }, { status: 403 })
  }

  const { data: target } = (await db
    .from('team_members')
    .select('pay_rate')
    .eq('id', to_member_id)
    .single()) as { data: { pay_rate: number | null } | null }
  if (!target) return NextResponse.json({ error: 'Target member not found' }, { status: 404 })

  const { data, error } = await db
    .from('bookings')
    .update({ team_member_id: to_member_id, pay_rate: target.pay_rate || null, status: 'confirmed' })
    .eq('id', booking_id)
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
