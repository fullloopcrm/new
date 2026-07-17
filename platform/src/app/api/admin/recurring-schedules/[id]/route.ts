import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { nowNaiveET } from '@/lib/recurring'

// Single recurring schedule: view / edit / cancel. Tenant-scoped, admin-only,
// client comms suppressed (see ../route.ts header). Cancelling a series cancels
// its future bookings but sends NO client notifications.

// Sibling routes (POST here, PUT /api/schedules/[id]) already guard
// recurring_type against this exact allowlist -- this PUT wrote body.recurring_type
// and body.status straight through with no check, so a bad recurring_type silently
// zeroes out cron/generate-recurring's date math (nextOccurrenceDates' switch falls
// through every case) and a bad status drops the schedule out of both the cron's
// status:'active' filter and the paused-resume sweep, with no error surfaced.
const VALID_RECURRING_TYPES = ['daily', 'weekly', 'biweekly', 'triweekly', 'monthly_date', 'monthly_weekday', 'custom']
const VALID_STATUSES = ['active', 'paused', 'cancelled']

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
    .gte('start_time', nowNaiveET())
    .in('status', ['scheduled', 'pending', 'confirmed'])
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

  // team_member_id is a cross-table FK -- same class of bug already fixed on
  // POST /api/bookings (fkChecks): an unvalidated FK here gets carried onto
  // this schedule's future bookings, then exfiltrated cross-tenant via the
  // team_members() join that GET routes trust blindly.
  if (teamMemberId) {
    const { data: owned } = await db.from('team_members').select('id').eq('id', teamMemberId).maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Invalid team_members' }, { status: 400 })
  }

  if (body.recurring_type !== undefined && !VALID_RECURRING_TYPES.includes(body.recurring_type)) {
    return NextResponse.json({ error: `recurring_type must be one of: ${VALID_RECURRING_TYPES.join(', ')}` }, { status: 400 })
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
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
  if (body.invoice_consolidation !== undefined) {
    if (!['per_visit', 'monthly'].includes(body.invoice_consolidation)) {
      return NextResponse.json({ error: 'invoice_consolidation must be per_visit or monthly' }, { status: 400 })
    }
    updatePayload.invoice_consolidation = body.invoice_consolidation
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
    const { data: reassigned } = await db
      .from('bookings')
      .update({ team_member_id: teamMemberId || null })
      .eq('schedule_id', id)
      .in('status', ['scheduled', 'pending', 'confirmed'])
      .gte('start_time', nowNaiveET())
      .select('id')

    // GET /api/bookings/:id/team and closeout-summary both source the LEAD
    // from booking_team_members, not bookings.team_member_id -- this bulk
    // reassign touched every future booking on the schedule but never
    // touched booking_team_members, leaving every one of those bookings'
    // lead rows stale. Same booking_team_members-sync gap already fixed
    // across every other team_member_id write site this session.
    const newLead = teamMemberId || null
    for (const row of reassigned || []) {
      await db.from('booking_team_members').delete().eq('booking_id', row.id).eq('is_lead', true)
      if (newLead) {
        await db.from('booking_team_members').upsert(
          { tenant_id: tenantId, booking_id: row.id, team_member_id: newLead, is_lead: true, position: 1 },
          { onConflict: 'booking_id,team_member_id' }
        )
      }
    }
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
    .in('status', ['scheduled', 'pending', 'confirmed'])
    .gte('start_time', nowNaiveET())
    .select('id')

  return NextResponse.json({
    success: true,
    schedule,
    bookings_cancelled: cancelled?.length || 0,
  })
}
