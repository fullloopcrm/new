import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { updateRecurringSchedule, RecurringScheduleNotFoundError } from '@/lib/recurring-schedule-update'

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

  const changes = {
    ...(teamMemberId !== undefined && { team_member_id: teamMemberId || null }),
    ...(body.recurring_type !== undefined && { recurring_type: body.recurring_type }),
    ...(body.day_of_week !== undefined && { day_of_week: body.day_of_week }),
    ...(body.days_of_week !== undefined && { days_of_week: body.days_of_week }),
    ...(body.preferred_time !== undefined && { preferred_time: body.preferred_time }),
    ...(body.duration_hours !== undefined && { duration_hours: body.duration_hours }),
    ...(body.hourly_rate !== undefined && { hourly_rate: body.hourly_rate }),
    ...(payRate !== undefined && { pay_rate: payRate }),
    ...(body.discount_percent !== undefined && { discount_percent: body.discount_percent }),
    ...(body.notes !== undefined && { notes: body.notes }),
    ...(body.special_instructions !== undefined && { special_instructions: body.special_instructions }),
    ...(body.status !== undefined && { status: body.status }),
  }

  try {
    // dry_run: preview exactly what syncing would change without writing
    // anything -- neither the schedule row nor any booking. Lets an admin
    // see the blast radius (how many bookings, what dates/prices) before
    // committing.
    if (body.dry_run === true) {
      const { sync } = await updateRecurringSchedule(tenantId, id, changes, { dryRun: true })
      const wouldSync = (sync?.bookings_synced ?? 0) > 0 || (sync?.bookings_skipped ?? 0) > 0
      return NextResponse.json({ dry_run: true, would_sync: wouldSync, sync })
    }

    // Admin edits never notify the client (existing no-client-comms policy
    // for admin-managed schedules, see this file's header) -- notifyClient
    // omitted.
    const { schedule, sync } = await updateRecurringSchedule(tenantId, id, changes)
    return NextResponse.json({ ...schedule, sync })
  } catch (err: unknown) {
    if (err instanceof RecurringScheduleNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    const message = err instanceof Error ? err.message : 'Failed to update recurring schedule'
    return NextResponse.json({ error: message }, { status: 500 })
  }
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
