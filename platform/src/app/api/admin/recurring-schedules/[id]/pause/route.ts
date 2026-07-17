import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

// Pause / resume a recurring schedule. Tenant-scoped, admin-only. Pausing
// cancels the bookings that fall inside the pause window but sends NO client
// notifications (see ../../route.ts header; feedback_no_client_sms).

// POST: pause until a date (cancels bookings in [now, paused_until]).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error } = await requirePermission('schedules.edit')
  if (error) return error
  const { tenantId } = tenant
  const db = tenantDb(tenantId)
  const { id } = await params

  const body = await request.json()
  const { paused_until } = body
  if (!paused_until) {
    return NextResponse.json({ error: 'paused_until date is required' }, { status: 400 })
  }

  const { data: schedule, error: sErr } = await db
    .from('recurring_schedules')
    .update({ status: 'paused', paused_until, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, clients(name)')
    .single()
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  const now = new Date().toISOString()
  const pauseEnd = paused_until + 'T23:59:59'
  const { data: cancelled } = await db
    .from('bookings')
    .update({ status: 'cancelled', cancelled_reason: 'schedule_paused' })
    .eq('schedule_id', id)
    .in('status', ['scheduled', 'pending', 'confirmed'])
    .gte('start_time', now)
    .lte('start_time', pauseEnd)
    .select('id')

  return NextResponse.json({
    success: true,
    schedule,
    bookings_cancelled: cancelled?.length || 0,
  })
}

// DELETE: resume early (un-pause). Also restores any bookings this schedule's
// pause cancelled (cancelled_reason='schedule_paused') whose date hasn't
// already passed — see ../../../schedules/[id]/pause/route.ts DELETE header
// for the full rationale (2026_07_16_bookings_cancellation_source.sql).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error } = await requirePermission('schedules.edit')
  if (error) return error
  const { tenantId } = tenant
  const db = tenantDb(tenantId)
  const { id } = await params

  const { data: schedule, error: sErr } = await db
    .from('recurring_schedules')
    .update({ status: 'active', paused_until: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, clients(name)')
    .single()
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  const now = new Date().toISOString()
  const { data: restored } = await db
    .from('bookings')
    .update({ status: 'scheduled', cancelled_reason: null })
    .eq('schedule_id', id)
    .eq('status', 'cancelled')
    .eq('cancelled_reason', 'schedule_paused')
    .gte('start_time', now)
    .select('id')

  return NextResponse.json({ success: true, schedule, bookings_restored: restored?.length || 0 })
}
