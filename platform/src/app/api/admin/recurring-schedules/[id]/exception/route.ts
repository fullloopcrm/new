import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { computeNaiveVisitWindow } from '@/lib/recurring'

// Per-occurrence exception for a recurring series: skip / move / reassign ONE
// date without disturbing the rest of the series. Records the exception (so the
// generator honors it on any future regeneration) AND applies it to the already-
// materialized booking for that date if one exists. Tenant-scoped, admin-only,
// no client notifications (admin-managed flow).

type ExType = 'skip' | 'move' | 'reassign'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error } = await requirePermission('schedules.edit')
  if (error) return error
  const { tenantId } = tenant
  const db = tenantDb(tenantId)
  const { id } = await params

  const body = await request.json()
  const occurrence_date: string | undefined = body.occurrence_date // 'YYYY-MM-DD'
  const type: ExType | undefined = body.type
  const new_start_time: string | null = body.new_start_time ?? null // 'HH:MM'
  const new_team_member_id: string | null = body.new_team_member_id ?? null

  if (!occurrence_date || !type || !['skip', 'move', 'reassign'].includes(type)) {
    return NextResponse.json({ error: 'occurrence_date and type (skip|move|reassign) required' }, { status: 400 })
  }
  if (type === 'move' && !new_start_time) {
    return NextResponse.json({ error: 'new_start_time required for move' }, { status: 400 })
  }
  if (type === 'reassign' && !new_team_member_id) {
    return NextResponse.json({ error: 'new_team_member_id required for reassign' }, { status: 400 })
  }

  // Confirm the schedule belongs to this tenant; pull duration for move end-time.
  const { data: schedule } = await db
    .from('recurring_schedules')
    .select('id, duration_hours')
    .eq('id', id)
    .single()
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })

  // new_team_member_id is a cross-table FK -- same class of bug already fixed
  // on POST /api/bookings (fkChecks): an unvalidated FK here gets written onto
  // the exception AND the materialized booking below, then exfiltrated
  // cross-tenant via the team_members() join that GET routes trust blindly.
  if (type === 'reassign' && new_team_member_id) {
    const { data: owned } = await db.from('team_members').select('id').eq('id', new_team_member_id).maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Invalid team_members' }, { status: 400 })
  }

  // Record (or replace) the exception for this date.
  const { error: upErr } = await db
    .from('recurring_exceptions')
    .upsert(
      { schedule_id: id, occurrence_date, type, new_start_time, new_team_member_id },
      { onConflict: 'schedule_id,occurrence_date' }
    )
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Apply to the materialized booking for that date, if present (scheduled/pending only).
  const dayStart = `${occurrence_date}T00:00:00`
  const dayEnd = `${occurrence_date}T23:59:59`
  const { data: existing } = await db
    .from('bookings')
    .select('id, start_time')
    .eq('schedule_id', id)
    .in('status', ['scheduled', 'pending'])
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd)

  // Check-then-act, not atomic: the `status in (scheduled, pending)` filter
  // above is a stale snapshot -- a team member can check in/complete one of
  // these bookings between that read and the per-row writes below. Without
  // re-asserting the same status filter on each write, a 'skip' exception
  // landing in that gap would silently DELETE an already-in-progress/
  // completed booking (losing checkout time/actual_hours/pay), and
  // 'move'/'reassign' would silently retime/reassign a job already underway.
  let applied = 0
  for (const b of existing || []) {
    if (type === 'skip') {
      const { data: deleted } = await db.from('bookings').delete()
        .eq('id', b.id).in('status', ['scheduled', 'pending'])
        .select('id').maybeSingle()
      if (deleted) applied++
    } else if (type === 'move' && new_start_time) {
      const [mh, mm] = new_start_time.split(':').map(Number)
      const { startISO, endISO } = computeNaiveVisitWindow(occurrence_date, mh || 0, mm || 0, Number(schedule.duration_hours) || 3)
      const { data: moved } = await db.from('bookings').update({ start_time: startISO, end_time: endISO })
        .eq('id', b.id).in('status', ['scheduled', 'pending'])
        .select('id').maybeSingle()
      if (moved) applied++
    } else if (type === 'reassign') {
      const { data: reassigned } = await db.from('bookings').update({ team_member_id: new_team_member_id })
        .eq('id', b.id).in('status', ['scheduled', 'pending'])
        .select('id').maybeSingle()
      if (reassigned) applied++
    }
  }

  return NextResponse.json({ success: true, type, occurrence_date, bookings_updated: applied })
}
