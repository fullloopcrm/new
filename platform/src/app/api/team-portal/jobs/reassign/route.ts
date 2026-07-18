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

  const previous = booking.team_member_id

  const { data: target } = await supabaseAdmin
    .from('team_members')
    .select('pay_rate')
    .eq('id', to_member_id)
    .eq('tenant_id', auth.tid)
    .single()
  if (!target) return NextResponse.json({ error: 'Target member not found' }, { status: 404 })

  // Compare-and-swap on the assignee we just read: two managers reassigning
  // the SAME job within the same window would otherwise both pass the fetch
  // above and both fall through to their own booking_team_members delete+
  // upsert pair below -- unguarded, those two pairs aren't ordered against
  // each other, so the loser's sync can land AFTER the winner's and leave
  // booking_team_members.lead pointing at a different member than
  // bookings.team_member_id. Re-asserting `previous` in this update's own
  // WHERE means only the request that still matches the row it read wins the
  // claim; the loser bails out before touching booking_team_members at all,
  // same desync class already fixed at every other team_member_id write site
  // this session, now closed for reassign's own write-write race.
  let claimQuery = supabaseAdmin
    .from('bookings')
    .update({ team_member_id: to_member_id, pay_rate: target.pay_rate || null, status: 'confirmed' })
    .eq('id', booking_id)
    .eq('tenant_id', auth.tid)
  claimQuery = previous == null ? claimQuery.is('team_member_id', null) : claimQuery.eq('team_member_id', previous)
  const { data, error } = await claimQuery.select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) {
    const { data: current } = await supabaseAdmin
      .from('bookings')
      .select('team_member_id')
      .eq('id', booking_id)
      .eq('tenant_id', auth.tid)
      .maybeSingle()
    return NextResponse.json(
      { error: 'Job was reassigned concurrently', team_member_id: current?.team_member_id ?? null },
      { status: 409 },
    )
  }

  // GET /api/bookings/:id/team and closeout-summary both source the LEAD from
  // booking_team_members, not bookings.team_member_id — falling back to the
  // latter only when no booking_team_members rows exist at all, never true
  // here (every job reachable from the field portal was created with a lead
  // row). Updating only bookings.team_member_id above left that lead row
  // stale, so the admin Team panel and closeout payout attribution kept
  // showing the OLD member after a field reassign — same
  // booking_team_members-sync gap already fixed for cron/generate-recurring's
  // refill, the regenerate route, and the admin exception reassign path.
  // The upsert's error was previously never checked. A concurrent writer to
  // this SAME booking's team (PUT /api/bookings/[id]/team, which does its own
  // delete-all+insert-all of booking_team_members) can land an is_lead=true
  // row for this booking between OUR delete above and this upsert — the
  // DB-level backstop (booking_team_members_one_lead_per_booking, migration
  // 2026_07_18_booking_team_members_one_lead_per_booking.sql) rejects the
  // resulting second "true" lead with 23505. Left unchecked, that failure was
  // silently swallowed and this booking was left with NO is_lead row at all
  // (our delete above already ran) — closeout-summary sources tip-share
  // attribution from `booking_team_members.is_lead`, and only falls back to
  // bookings.team_member_id when the table has ZERO rows for the booking, not
  // merely zero is_lead rows, so a multi-tech job in that state would silently
  // misattribute the lead's tip remainder to nobody. Our own delete above
  // already cleared any pre-existing lead row (including one just inserted by
  // that concurrent writer), so a single retry clears the transient collision.
  await supabaseAdmin.from('booking_team_members').delete().eq('booking_id', booking_id).eq('is_lead', true)
  const upsertLead = () =>
    supabaseAdmin.from('booking_team_members').upsert(
      { tenant_id: auth.tid, booking_id: booking_id, team_member_id: to_member_id, is_lead: true, position: 1 },
      { onConflict: 'booking_id,team_member_id' }
    )
  let { error: leadSyncErr } = await upsertLead()
  if (leadSyncErr) {
    await supabaseAdmin.from('booking_team_members').delete().eq('booking_id', booking_id).eq('is_lead', true)
    ;({ error: leadSyncErr } = await upsertLead())
  }
  if (leadSyncErr) {
    console.error('[reassign] booking_team_members lead sync failed after retry:', leadSyncErr)
  }

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
