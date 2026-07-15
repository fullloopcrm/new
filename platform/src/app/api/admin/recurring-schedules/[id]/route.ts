import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

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

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (teamMemberId !== undefined) updatePayload.team_member_id = teamMemberId || null
  if (body.recurring_type !== undefined) updatePayload.recurring_type = body.recurring_type
  if (body.day_of_week !== undefined) updatePayload.day_of_week = body.day_of_week
  if (body.preferred_time !== undefined) updatePayload.preferred_time = body.preferred_time
  if (body.duration_hours !== undefined) updatePayload.duration_hours = body.duration_hours
  if (body.hourly_rate !== undefined) updatePayload.hourly_rate = body.hourly_rate
  if (payRate !== undefined) updatePayload.pay_rate = payRate
  if (body.notes !== undefined) updatePayload.notes = body.notes
  if (body.special_instructions !== undefined) updatePayload.special_instructions = body.special_instructions
  if (body.status !== undefined) updatePayload.status = body.status

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
      .gte('start_time', new Date().toISOString())
  }

  return NextResponse.json(data)
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
