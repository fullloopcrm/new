import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { audit } from '@/lib/audit'
import { etToday, addCalendarDays, formatNaiveET } from '@/lib/recurring'

export async function POST(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'jobs.claim')
  if (permError) return permError

  const { booking_id } = await request.json().catch(() => ({}))
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  // Member's pay rate + daily cap.
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('pay_rate, max_jobs_per_day')
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)
    .single()

  // Enforce the daily claim cap (hoarding guard) — jobs already assigned to this
  // member that start today.
  const cap = member?.max_jobs_per_day
  if (cap && cap > 0) {
    // bookings.start_time is naive-ET (see lib/recurring.ts's nowNaiveET
    // header) -- `new Date(); setHours(0,0,0,0)` read the SERVER's local
    // calendar (UTC on Vercel), not ET, silently shifting the daily cap
    // window by the ET/UTC gap near midnight ET (same class fixed across
    // this session). Anchored to etToday() + naive-ET strings instead.
    const dayStartCal = etToday()
    const dayStart = formatNaiveET(dayStartCal)
    const dayEnd = formatNaiveET(addCalendarDays(dayStartCal, 1))
    const { count } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', auth.tid)
      .eq('team_member_id', auth.id)
      .gte('start_time', dayStart)
      .lt('start_time', dayEnd)
      .not('status', 'eq', 'cancelled')
    if ((count ?? 0) >= cap) {
      return NextResponse.json({ error: `Daily job limit reached (${cap})` }, { status: 409 })
    }
  }

  // Atomic claim: the `team_member_id IS NULL` filter on the UPDATE makes this
  // first-writer-wins — a concurrent claim updates zero rows → "already taken".
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({
      team_member_id: auth.id,
      pay_rate: member?.pay_rate || null,
      status: 'confirmed',
    })
    .eq('id', booking_id)
    .eq('tenant_id', auth.tid)
    .is('team_member_id', null)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) {
    return NextResponse.json({ error: 'Job already taken' }, { status: 409 })
  }

  // GET /api/bookings/:id/team and closeout-summary both source the lead
  // from booking_team_members, not bookings.team_member_id -- claiming an
  // open job set the latter but never created the matching lead row, so a
  // self-claimed job showed as unassigned in the admin Team panel and
  // closeout payout attribution despite having a real assignee. Same
  // booking_team_members-sync gap fixed at every other team_member_id write
  // site this session, including this route's own release sibling (which
  // deletes this same row on the way out).
  //
  // The upsert's error was previously never checked. A concurrent writer to
  // this SAME booking's team (PUT /api/bookings/[id]/team, or the
  // recurring-schedules exception 'reassign' path) can land a competing
  // is_lead=true row for this booking between the CAS'd claim above and this
  // upsert -- the DB-level backstop (booking_team_members_one_lead_per_booking,
  // migration 2026_07_18_booking_team_members_one_lead_per_booking.sql)
  // rejects the resulting second "true" lead with 23505. This booking's
  // bookings.team_member_id is now authoritatively `auth.id` (the CAS above
  // already won), so clear whatever stale lead row lost the race and retry
  // once -- same pattern as reassign's own fix for this gap.
  const upsertLead = () =>
    supabaseAdmin.from('booking_team_members').upsert(
      { tenant_id: auth.tid, booking_id: booking_id, team_member_id: auth.id, is_lead: true, position: 1 },
      { onConflict: 'booking_id,team_member_id' }
    )
  let { error: leadSyncErr } = await upsertLead()
  if (leadSyncErr) {
    await supabaseAdmin.from('booking_team_members').delete().eq('booking_id', booking_id).eq('is_lead', true)
    ;({ error: leadSyncErr } = await upsertLead())
  }
  if (leadSyncErr) {
    console.error('[claim] booking_team_members lead sync failed after retry:', leadSyncErr)
  }

  await audit({
    tenantId: auth.tid,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: { event: 'claimed', by: auth.id },
  })

  return NextResponse.json({ booking: data })
}
