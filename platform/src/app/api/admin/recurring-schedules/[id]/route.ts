import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { nowNaiveET } from '@/lib/recurring'
import { syncFutureBookings } from '@/lib/recurring-sync'

// Single recurring schedule: view / edit / cancel. Tenant-scoped, admin-only,
// client comms suppressed (see ../route.ts header). Cancelling a series cancels
// its future bookings but sends NO client notifications.

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error } = await requirePermission('schedules.view')
  if (error) return error
  const { tenantId } = tenant
  const { id } = await params
  const db = tenantDb(tenantId)

  const { data: schedule, error: qErr } = await db
    .from('recurring_schedules')
    .select('*, clients(id, name, phone, address, email), team_members(id, name)')
    .eq('id', id)
    .single()
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 404 })

  const { data: bookings } = await db
    .from('bookings')
    .select('id, start_time, end_time, status, team_member_id, team_members!bookings_team_member_id_fkey(name)')
    .eq('schedule_id', id)
    .gte('start_time', new Date().toISOString())
    .in('status', ['scheduled', 'pending'])
    .order('start_time')

  return NextResponse.json({ ...schedule, upcoming_bookings: bookings || [] })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error } = await requirePermission('schedules.edit')
  if (error) return error
  const { tenantId } = tenant
  const { id } = await params
  const body = await request.json()
  const db = tenantDb(tenantId)

  const teamMemberId = body.team_member_id !== undefined ? body.team_member_id : body.cleaner_id
  const payRate = body.pay_rate !== undefined ? body.pay_rate : body.cleaner_pay_rate

  // A caller-supplied team_member_id must belong to THIS tenant — team_members
  // has no cross-tenant FK check, so without this a tenant admin could reassign
  // a schedule (and its future bookings) to another tenant's employee.
  if (teamMemberId) {
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('id', teamMemberId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!member) return NextResponse.json({ error: 'Invalid team member' }, { status: 400 })
  }

  // Fetch the current row first -- needed to detect whether this edit
  // actually changes anything that affects already-generated future
  // bookings (day/time/rate/discount), and to support a non-destructive
  // dry-run preview.
  const { data: current, error: curErr } = await db
    .from('recurring_schedules')
    .select('recurring_type, day_of_week, preferred_time, duration_hours, hourly_rate, discount_percent')
    .eq('id', id)
    .single()
  if (curErr || !current) return NextResponse.json({ error: curErr?.message || 'Not found' }, { status: 404 })

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (teamMemberId !== undefined) updatePayload.team_member_id = teamMemberId || null
  if (body.recurring_type !== undefined) updatePayload.recurring_type = body.recurring_type
  if (body.day_of_week !== undefined) updatePayload.day_of_week = body.day_of_week
  if (body.preferred_time !== undefined) updatePayload.preferred_time = body.preferred_time
  if (body.duration_hours !== undefined) updatePayload.duration_hours = body.duration_hours
  if (body.hourly_rate !== undefined) updatePayload.hourly_rate = body.hourly_rate
  if (payRate !== undefined) updatePayload.pay_rate = payRate
  if (body.discount_percent !== undefined) updatePayload.discount_percent = body.discount_percent
  if (body.notes !== undefined) updatePayload.notes = body.notes
  if (body.special_instructions !== undefined) updatePayload.special_instructions = body.special_instructions
  if (body.status !== undefined) updatePayload.status = body.status

  // datesChanged -- the pattern itself moved, so future bookings need
  // re-dating, not just a time/price recompute on their existing dates.
  const datesChanged =
    (body.recurring_type !== undefined && body.recurring_type !== current.recurring_type) ||
    (body.day_of_week !== undefined && body.day_of_week !== current.day_of_week)
  const affectsFutureBookings =
    datesChanged ||
    (body.preferred_time !== undefined && body.preferred_time !== current.preferred_time) ||
    (body.duration_hours !== undefined && Number(body.duration_hours) !== Number(current.duration_hours)) ||
    (body.hourly_rate !== undefined && Number(body.hourly_rate) !== Number(current.hourly_rate)) ||
    (body.discount_percent !== undefined && body.discount_percent !== current.discount_percent)

  const merged = { ...current, ...updatePayload }
  const syncFields = {
    recurring_type: merged.recurring_type,
    day_of_week: merged.day_of_week,
    preferred_time: merged.preferred_time,
    duration_hours: merged.duration_hours,
    hourly_rate: merged.hourly_rate,
    discount_percent: merged.discount_percent,
  } as Parameters<typeof syncFutureBookings>[2]

  // dry_run: preview exactly what syncing would change without writing
  // anything -- neither the schedule row nor any booking. Lets an admin see
  // the blast radius (how many bookings, what dates/prices) before committing.
  if (body.dry_run === true) {
    if (!affectsFutureBookings) {
      return NextResponse.json({ dry_run: true, would_sync: false, sync: { bookings_synced: 0, bookings_skipped: 0, skipped_reasons: [], new_next_generate_after: null } })
    }
    const preview = await syncFutureBookings(tenantId, id, syncFields, datesChanged, true)
    return NextResponse.json({ dry_run: true, would_sync: true, sync: preview })
  }

  const { data, error: uErr } = await db
    .from('recurring_schedules')
    .update(updatePayload)
    .eq('id', id)
    .select('*, clients(id, name), team_members(id, name)')
    .single()
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  // Reassign future bookings if the team member changed. No notification sent
  // (admin-only flow); the new assignee sees it in their portal.
  if (teamMemberId !== undefined) {
    await db
      .from('bookings')
      .update({ team_member_id: teamMemberId || null })
      .eq('schedule_id', id)
      .in('status', ['scheduled', 'pending'])
      .gte('start_time', nowNaiveET())
  }

  // Sync day/time/rate/discount onto already-generated future bookings so an
  // edit doesn't leave them stale until the cron eventually regenerates them
  // (which can be weeks away). Ported from nycmaid's 2026-07-20 recurring
  // booking rebuild -- previously ONLY team_member_id propagated here.
  let sync = null
  if (affectsFutureBookings) {
    sync = await syncFutureBookings(tenantId, id, {
      recurring_type: data.recurring_type,
      day_of_week: data.day_of_week,
      preferred_time: data.preferred_time,
      duration_hours: data.duration_hours,
      hourly_rate: data.hourly_rate,
      discount_percent: data.discount_percent,
    }, datesChanged, false)
  }

  return NextResponse.json({ ...data, sync })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error } = await requirePermission('schedules.edit')
  if (error) return error
  const { tenantId } = tenant
  const { id } = await params
  const db = tenantDb(tenantId)

  const { data: schedule, error: sErr } = await db
    .from('recurring_schedules')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, clients(name)')
    .single()
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  const { data: cancelled } = await db
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('schedule_id', id)
    .in('status', ['scheduled', 'pending'])
    .gte('start_time', new Date().toISOString())
    .select('id')

  return NextResponse.json({
    success: true,
    schedule,
    bookings_cancelled: cancelled?.length || 0,
  })
}
