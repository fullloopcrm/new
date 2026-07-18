import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { audit } from '@/lib/audit'
import { toNaiveET } from '@/lib/dates'

// POST — pause until date. Cancels any bookings within the pause window and
// notifies the client via SMS if tenant has Telnyx configured.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenant, error: authError } = await requirePermission('schedules.edit')
    if (authError) return authError
    const { tenantId } = tenant
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
      .select('*, clients(name, phone, email, sms_consent, do_not_service)')
      .single()

    if (error || !schedule) {
      return NextResponse.json({ error: error?.message || 'Schedule not found' }, { status: 404 })
    }

    // start_time is a naive-ET TIMESTAMP (no tz); a real-UTC .toISOString()
    // cutoff is shifted later by the EST/EDT offset, silently leaving the
    // next ~4-5h of bookings 'scheduled' every evening ET even though the
    // schedule was just paused for that window -- same class already fixed
    // on the sibling admin/recurring-schedules + schedules/[id] routes
    // (d69ae7e1), missed here.
    const now = toNaiveET(new Date())
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

    const client = schedule.clients as unknown as { name?: string; phone?: string; email?: string; sms_consent?: boolean | null; do_not_service?: boolean | null } | null
    const cancelledCount = cancelled?.length || 0

    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenantId,
      type: 'schedule_paused',
      title: 'Schedule Paused',
      message: `${client?.name || 'Client'} — ${schedule.recurring_type} paused until ${paused_until} (${cancelledCount} cancelled)`,
      channel: 'in_app',
    })

    // do_not_service is a stronger, channel-agnostic kill-switch than
    // sms_consent (see notify.ts) -- this client SMS had neither check.
    if (cancelledCount > 0 && client?.phone && client.sms_consent !== false && !client.do_not_service) {
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

// DELETE — resume early.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenant, error: authError } = await requirePermission('schedules.edit')
    if (authError) return authError
    const { tenantId } = tenant
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

    await audit({ tenantId, action: 'schedule.updated', entityType: 'schedule', entityId: id, details: { resumed: true } })

    return NextResponse.json({ success: true, schedule })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('DELETE /api/schedules/[id]/pause error:', e)
    return NextResponse.json({ error: 'Failed to resume' }, { status: 500 })
  }
}
