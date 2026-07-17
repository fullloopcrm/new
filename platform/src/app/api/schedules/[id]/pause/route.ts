import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { sendSMS } from '@/lib/sms'
import { audit } from '@/lib/audit'
import { nowNaiveET } from '@/lib/recurring'

// POST — pause until date. Cancels any bookings within the pause window and
// notifies the client via SMS if tenant has Telnyx configured.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenant, error: authError } = await requirePermission('schedules.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const db = tenantDb(tenantId)
    const { id } = await params
    const { paused_until } = await request.json()
    if (!paused_until) {
      return NextResponse.json({ error: 'paused_until is required' }, { status: 400 })
    }

    const { data: schedule, error } = await db
      .from('recurring_schedules')
      .update({ status: 'paused', paused_until, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, clients(name, phone, email)')
      .single()

    if (error || !schedule) {
      return NextResponse.json({ error: error?.message || 'Schedule not found' }, { status: 404 })
    }

    const now = nowNaiveET()
    const pauseEnd = `${paused_until}T23:59:59`

    const { data: cancelled } = await db
      .from('bookings')
      .update({ status: 'cancelled', cancelled_reason: 'schedule_paused' })
      .eq('schedule_id', id)
      .in('status', ['scheduled', 'pending', 'confirmed'])
      .gte('start_time', now)
      .lte('start_time', pauseEnd)
      .select('id')

    const client = schedule.clients as unknown as { name?: string; phone?: string; email?: string } | null
    const cancelledCount = cancelled?.length || 0

    await db.from('notifications').insert({
      type: 'schedule_paused',
      title: 'Schedule Paused',
      message: `${client?.name || 'Client'} — ${schedule.recurring_type} paused until ${paused_until} (${cancelledCount} cancelled)`,
      channel: 'in_app',
    })

    if (cancelledCount > 0 && client?.phone) {
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('name, telnyx_api_key, telnyx_phone')
        .eq('id', tenantId)
        .single()

      if (tenant?.telnyx_api_key && tenant.telnyx_phone) {
        sendSMS({
          to: client.phone,
          body: `Your recurring service is paused until ${paused_until}. We've cancelled ${cancelledCount} upcoming visits. — ${tenant.name || ''}`,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        }).catch(err => console.error('[pause] client SMS failed:', err))
      }
    }

    await audit({ tenantId, action: 'schedule.paused', entityType: 'schedule', entityId: id, details: { paused_until, bookings_cancelled: cancelledCount } })

    return NextResponse.json({ success: true, schedule, bookings_cancelled: cancelledCount })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('POST /api/schedules/[id]/pause error:', e)
    return NextResponse.json({ error: 'Failed to pause' }, { status: 500 })
  }
}

// DELETE — resume early. Restores any bookings that this schedule's pause
// cancelled (cancelled_reason='schedule_paused') and whose date hasn't
// already passed — resuming early should give the client back the visits
// that fall inside the now-shortened pause window, not just flip the
// schedule's own status and leave those visits cancelled forever.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenant, error: authError } = await requirePermission('schedules.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const db = tenantDb(tenantId)
    const { id } = await params

    const { data: schedule, error } = await db
      .from('recurring_schedules')
      .update({ status: 'active', paused_until: null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, clients(name)')
      .single()

    if (error || !schedule) {
      return NextResponse.json({ error: error?.message || 'Schedule not found' }, { status: 404 })
    }

    const now = nowNaiveET()
    const { data: restored } = await db
      .from('bookings')
      .update({ status: 'scheduled', cancelled_reason: null })
      .eq('schedule_id', id)
      .eq('status', 'cancelled')
      .eq('cancelled_reason', 'schedule_paused')
      .gte('start_time', now)
      .select('id')
    const restoredCount = restored?.length || 0

    const client = schedule.clients as unknown as { name?: string } | null
    await db.from('notifications').insert({
      type: 'schedule_resumed',
      title: 'Schedule Resumed',
      message: `${client?.name || 'Client'} — ${schedule.recurring_type} resumed${restoredCount > 0 ? ` (${restoredCount} visit${restoredCount === 1 ? '' : 's'} restored)` : ''}`,
      channel: 'in_app',
    })

    await audit({ tenantId, action: 'schedule.updated', entityType: 'schedule', entityId: id, details: { resumed: true, bookings_restored: restoredCount } })

    return NextResponse.json({ success: true, schedule, bookings_restored: restoredCount })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('DELETE /api/schedules/[id]/pause error:', e)
    return NextResponse.json({ error: 'Failed to resume' }, { status: 500 })
  }
}
