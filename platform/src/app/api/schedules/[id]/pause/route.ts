import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'

// POST — pause until date. Cancels any bookings within the pause window and
// notifies the client via SMS if tenant has Telnyx configured.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const { paused_until } = await request.json()
    if (!paused_until) {
      return NextResponse.json({ error: 'paused_until is required' }, { status: 400 })
    }

    const { data: schedule, error } = await supabaseAdmin
      .from('recurring_schedules')
      .update({ status: 'paused', paused_until, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*, clients(name, phone, email)')
      .single()

    if (error || !schedule) {
      return NextResponse.json({ error: error?.message || 'Schedule not found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const pauseEnd = `${paused_until}T23:59:59`

    const { data: cancelled } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('schedule_id', id)
      .eq('tenant_id', tenantId)
      .in('status', ['scheduled', 'pending', 'confirmed'])
      .gte('start_time', now)
      .lte('start_time', pauseEnd)
      .select('id')

    const client = schedule.clients as unknown as { name?: string; phone?: string; email?: string } | null
    const cancelledCount = cancelled?.length || 0

    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenantId,
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

    return NextResponse.json({ success: true, schedule, bookings_cancelled: cancelledCount })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('POST /api/schedules/[id]/pause error:', e)
    return NextResponse.json({ error: 'Failed to pause' }, { status: 500 })
  }
}

// DELETE — resume early.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    const { data: schedule, error } = await supabaseAdmin
      .from('recurring_schedules')
      .update({ status: 'active', paused_until: null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*, clients(name)')
      .single()

    if (error || !schedule) {
      return NextResponse.json({ error: error?.message || 'Schedule not found' }, { status: 404 })
    }

    const client = schedule.clients as unknown as { name?: string } | null
    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenantId,
      type: 'schedule_resumed',
      title: 'Schedule Resumed',
      message: `${client?.name || 'Client'} — ${schedule.recurring_type} resumed`,
      channel: 'in_app',
    })

    return NextResponse.json({ success: true, schedule })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('DELETE /api/schedules/[id]/pause error:', e)
    return NextResponse.json({ error: 'Failed to resume' }, { status: 500 })
  }
}
