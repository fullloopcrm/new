import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { audit } from '@/lib/audit'
import { pick } from '@/lib/validate'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('schedules.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params

    const [{ data: schedule }, { data: bookings }] = await Promise.all([
      supabaseAdmin
        .from('recurring_schedules')
        .select('*, clients(name, phone, address), team_members(name, phone)')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single(),
      supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('schedule_id', id)
        .eq('tenant_id', tenantId)
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
    const { id } = await params
    const body = await request.json()
    const fields = pick(body, ['recurring_type', 'day_of_week', 'preferred_time', 'duration_hours', 'notes', 'special_instructions'])

    const { data, error } = await supabaseAdmin
      .from('recurring_schedules')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
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
    const { id } = await params

    // Cancel future bookings
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('schedule_id', id)
      .eq('tenant_id', tenantId)
      .gte('start_time', new Date().toISOString())
      .in('status', ['scheduled', 'confirmed'])

    // Cancel the schedule
    const { error } = await supabaseAdmin
      .from('recurring_schedules')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('tenant_id', tenantId)

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
