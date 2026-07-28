import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { audit } from '@/lib/audit'
import { pick } from '@/lib/validate'
import { nowNaiveET } from '@/lib/recurring'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('schedules.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const db = tenantDb(tenantId)
    const { id } = await params

    const [{ data: schedule }, { data: bookings }] = await Promise.all([
      db
        .from('recurring_schedules')
        .select('*, clients(name, phone, address), team_members(name, phone)')
        .eq('id', id)
        .single(),
      db
        .from('bookings')
        .select('*')
        .eq('schedule_id', id)
        .order('start_time'),
    ])

    if (!schedule) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ schedule, bookings })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('schedules.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const db = tenantDb(tenantId)
    const { id } = await params
    const body = await request.json()
    const fields = pick(body, ['recurring_type', 'day_of_week', 'preferred_time', 'duration_hours', 'notes', 'special_instructions'])

    const { data, error } = await db
      .from('recurring_schedules')
      .update(fields)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'schedule.updated', entityType: 'schedule', entityId: id })

    return NextResponse.json({ schedule: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('schedules.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const db = tenantDb(tenantId)
    const { id } = await params

    // Cancel future bookings — start_time is naive ET; a real-instant boundary
    // here left early-morning ET bookings uncancelled when their schedule was
    // deleted, since they looked like they'd already happened.
    await db
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('schedule_id', id)
      .gte('start_time', `${nowNaiveET()}Z`)
      .in('status', ['scheduled', 'confirmed'])

    // Snapshot who's actually assigned right now, before the status flip —
    // team_member_id is live/mutable and nothing else records who held the
    // relationship at the moment of cancellation. Same pattern as the
    // admin/recurring-schedules/[id] DELETE sibling. See
    // migrations/2026_07_28_recurring_schedule_cancellation_attribution.sql.
    const { data: preCancel } = await db
      .from('recurring_schedules')
      .select('team_member_id')
      .eq('id', id)
      .single()

    // Cancel the schedule
    const { error } = await db
      .from('recurring_schedules')
      .update({
        status: 'cancelled',
        cancelled_team_member_id: preCancel?.team_member_id ?? null,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'schedule.deleted', entityType: 'schedule', entityId: id })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
