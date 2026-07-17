import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePortalPermission, scopedMemberIds } from '@/lib/team-portal-auth'
import { notifyTeamMember } from '@/lib/notify-team-member'
import { teamSmsTemplates } from '@/lib/messaging/team-sms-resolver'
import { smsJobCancelled } from '@/lib/sms-templates'
import { audit } from '@/lib/audit'
import { getSettings } from '@/lib/settings'
import { shiftNaiveTimestamp } from '@/lib/cleaner-availability'

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
    .select('id, team_member_id, start_time, end_time, is_emergency, clients(name)')
    .eq('id', booking_id)
    .single()) as { data: { id: string; team_member_id: string | null; start_time: string | null; end_time: string | null; is_emergency: boolean | null; clients: { name: string | null } | null } | null }
  if (!booking) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const previous = booking.team_member_id

  // The booking's current holder (if any) must also be inside the actor's
  // scope — otherwise a lead could reassign a job belonging to a different
  // crew/lead by simply supplying its booking_id.
  if (previous && !scope.includes(previous)) {
    return NextResponse.json({ error: 'That job is not in your crew' }, { status: 403 })
  }

  // Time-conflict guard — nothing previously stopped a lead from reassigning a
  // job onto a member who already has an overlapping job that day. Mirrors the
  // buffer-aware conflict check /api/bookings' POST applies to admin/agent
  // assignments and .../jobs/claim now applies to self-service claims.
  if (booking.start_time) {
    const settings = await getSettings(auth.tid)
    const bufferMin = Math.max(0, settings.booking_buffer_minutes)
    const endTime = booking.end_time || shiftNaiveTimestamp(booking.start_time, 180)
    const startWithBuffer = shiftNaiveTimestamp(booking.start_time, -bufferMin)
    const endWithBuffer = shiftNaiveTimestamp(endTime, bufferMin)

    const { count: conflictCount } = await db
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('team_member_id', to_member_id)
      .neq('id', booking_id)
      .not('status', 'in', '("cancelled","no_show")')
      .lt('start_time', endWithBuffer)
      .gt('end_time', startWithBuffer)
    if ((conflictCount ?? 0) > 0) {
      return NextResponse.json({ error: 'That member already has a job that overlaps this time' }, { status: 409 })
    }
  }

  const { data: target } = (await db
    .from('team_members')
    .select('pay_rate')
    .eq('id', to_member_id)
    .single()) as { data: { pay_rate: number | null } | null }
  if (!target) return NextResponse.json({ error: 'Target member not found' }, { status: 404 })

  // Re-check team_member_id in the UPDATE's own WHERE — without this, a
  // concurrent claim/release/reassign landing between the SELECT above and
  // this UPDATE would be silently clobbered (the booking could be reassigned
  // out from under whoever holds it now, not who held it when we read it).
  let reassignQuery = db
    .from('bookings')
    .update({ team_member_id: to_member_id, pay_rate: target.pay_rate || null, status: 'confirmed' })
    .eq('id', booking_id)
  reassignQuery = previous ? reassignQuery.eq('team_member_id', previous) : reassignQuery.is('team_member_id', null)
  const { data, error } = await reassignQuery.select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Job was claimed or reassigned by someone else — refresh and try again' }, { status: 409 })

  await audit({
    tenantId: auth.tid,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: { event: 'reassigned', by: auth.id, from: previous, to: to_member_id },
  })

  // Notify both sides — accountability so no one silently loses/gains a job.
  // Escalate wording for a same-day emergency, same 🚨 convention items
  // (20)/(22)/(24)/(26) already established elsewhere in the dispatch chain.
  //
  // Archetype-depth fix: this was the only team-member push in the codebase
  // sent via sendPushToTeamMember() directly instead of notifyTeamMember()
  // (the module items (53)/(54)/(56)/(58)/(60) established as the one true
  // channel for team-member notifications) — so a reassignment skipped the
  // in-app record, the SMS/email fallback for a push-less or push-declined
  // tech, the item (48) SMS-consent gate, and quiet hours entirely (routine
  // reassignments always pushed regardless of the hour; an emergency one had
  // no reliable non-push fallback if the push subscription was stale).
  const isEmergency = !!booking.is_emergency
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, industry, phone, website_url, domain, domain_name, google_place_id, timezone')
    .eq('id', auth.tid)
    .single()
  const bizName = tenant?.name || 'Your Business'
  const when = booking.start_time ? new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: tenant?.timezone || 'America/New_York', month: 'short', day: 'numeric' }) : ''
  try {
    await notifyTeamMember({
      tenantId: auth.tid,
      teamMemberId: to_member_id,
      type: 'job_assignment',
      title: isEmergency ? '🚨 Urgent job assigned' : 'New job assigned',
      message: `You've been assigned a job${when ? ` on ${when}` : ''}.`,
      bookingId: booking_id,
      smsMessage: tenant && booking.start_time
        ? teamSmsTemplates(tenant).jobAssignment({
            start_time: booking.start_time,
            is_emergency: booking.is_emergency,
            pay_rate: target.pay_rate,
            clients: booking.clients?.name ? { name: booking.clients.name } : null,
          })
        : undefined,
      skipEmail: true,
      isEmergency,
    })
    if (previous && previous !== to_member_id) {
      await notifyTeamMember({
        tenantId: auth.tid,
        teamMemberId: previous,
        type: 'job_cancelled',
        title: isEmergency ? '🚨 Urgent job reassigned' : 'Job reassigned',
        message: `A job${when ? ` on ${when}` : ''} was moved to a teammate.`,
        bookingId: booking_id,
        smsMessage: booking.start_time
          ? smsJobCancelled(bizName, { start_time: booking.start_time, clients: booking.clients?.name ? { name: booking.clients.name } : null })
          : undefined,
        skipEmail: true,
        isEmergency,
      })
    }
  } catch (e) {
    console.error('[reassign] notify failed (non-fatal):', e)
  }

  return NextResponse.json({ booking: data })
}
