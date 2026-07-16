import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

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

  // Confirm a caller-supplied team member actually belongs to this tenant --
  // otherwise a foreign id gets written onto the exception + booking and
  // resurfaces via the team_members() join, a cross-tenant PII leak (same
  // class fixed on the base recurring-schedules route in 4c0e3635).
  if (type === 'reassign' && new_team_member_id) {
    const { data: memberRow } = await supabaseAdmin
      .from('team_members').select('id').eq('id', new_team_member_id).eq('tenant_id', tenantId).single()
    if (!memberRow) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
  }

  // Confirm the schedule belongs to this tenant; pull duration for move end-time.
  const { data: schedule } = await supabaseAdmin
    .from('recurring_schedules')
    .select('id, duration_hours')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })

  // Record (or replace) the exception for this date.
  const { error: upErr } = await supabaseAdmin
    .from('recurring_exceptions')
    .upsert(
      { tenant_id: tenantId, schedule_id: id, occurrence_date, type, new_start_time, new_team_member_id },
      { onConflict: 'schedule_id,occurrence_date' }
    )
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Apply to the materialized booking for that date, if present (scheduled/pending only).
  const dayStart = `${occurrence_date}T00:00:00`
  const dayEnd = `${occurrence_date}T23:59:59`
  const { data: existing } = await supabaseAdmin
    .from('bookings')
    .select('id, start_time')
    .eq('tenant_id', tenantId)
    .eq('schedule_id', id)
    .in('status', ['scheduled', 'pending'])
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd)

  let applied = 0
  for (const b of existing || []) {
    if (type === 'skip') {
      await supabaseAdmin.from('bookings').delete().eq('id', b.id).eq('tenant_id', tenantId)
      applied++
    } else if (type === 'move' && new_start_time) {
      const [mh, mm] = new_start_time.split(':').map(Number)
      const startISO = `${occurrence_date}T${String(mh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`
      const endTotal = (mh || 0) * 60 + (mm || 0) + (Number(schedule.duration_hours) || 3) * 60
      const endISO = `${occurrence_date}T${String(Math.floor(endTotal / 60) % 24).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}:00`
      await supabaseAdmin.from('bookings').update({ start_time: startISO, end_time: endISO }).eq('id', b.id).eq('tenant_id', tenantId)
      applied++
    } else if (type === 'reassign') {
      await supabaseAdmin.from('bookings').update({ team_member_id: new_team_member_id }).eq('id', b.id).eq('tenant_id', tenantId)
      applied++
    }
  }

  return NextResponse.json({ success: true, type, occurrence_date, bookings_updated: applied })
}
