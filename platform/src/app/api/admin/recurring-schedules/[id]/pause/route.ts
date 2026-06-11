import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

// Pause / resume a recurring schedule. Tenant-scoped, admin-only. Pausing
// cancels the bookings that fall inside the pause window but sends NO client
// notifications (see ../../route.ts header; feedback_no_client_sms).

// POST: pause until a date (cancels bookings in [now, paused_until]).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error } = await requirePermission('schedules.edit')
  if (error) return error
  const { tenantId } = tenant
  const { id } = await params

  const body = await request.json()
  const { paused_until } = body
  if (!paused_until) {
    return NextResponse.json({ error: 'paused_until date is required' }, { status: 400 })
  }

  const { data: schedule, error: sErr } = await supabaseAdmin
    .from('recurring_schedules')
    .update({ status: 'paused', paused_until, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*, clients(name)')
    .single()
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  const now = new Date().toISOString()
  const pauseEnd = paused_until + 'T23:59:59'
  const { data: cancelled } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('tenant_id', tenantId)
    .eq('schedule_id', id)
    .in('status', ['scheduled', 'pending'])
    .gte('start_time', now)
    .lte('start_time', pauseEnd)
    .select('id')

  return NextResponse.json({
    success: true,
    schedule,
    bookings_cancelled: cancelled?.length || 0,
  })
}

// DELETE: resume early (un-pause).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error } = await requirePermission('schedules.edit')
  if (error) return error
  const { tenantId } = tenant
  const { id } = await params

  const { data: schedule, error: sErr } = await supabaseAdmin
    .from('recurring_schedules')
    .update({ status: 'active', paused_until: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*, clients(name)')
    .single()
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  return NextResponse.json({ success: true, schedule })
}
