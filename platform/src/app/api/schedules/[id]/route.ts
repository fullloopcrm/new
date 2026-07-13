import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { audit } from '@/lib/audit'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const db = tenantDb(tenantId)

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
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json()

    const { data, error } = await tenantDb(tenantId)
      .from('recurring_schedules')
      .update(body)
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
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const db = tenantDb(tenantId)

    // Cancel future bookings
    await db
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('schedule_id', id)
      .gte('start_time', new Date().toISOString())
      .in('status', ['scheduled', 'confirmed'])

    // Cancel the schedule
    const { error } = await db
      .from('recurring_schedules')
      .update({ status: 'cancelled' })
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
