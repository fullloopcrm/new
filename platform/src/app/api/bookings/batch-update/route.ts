import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'

/**
 * Batch update multiple bookings in parallel.
 * Sends ONE notification (for the first booking).
 * Used for "all future bookings" edits on recurring series.
 *
 * PUT /api/bookings/batch-update
 * Body: { updates: [{ id: "uuid", data: { start_time, end_time, ... } }], notify_type?: string }
 */
export async function PUT(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { updates, notify_type } = await request.json()

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array required' }, { status: 400 })
    }

    // client_id/team_member_id/service_type_id are cross-table FKs -- confirm
    // each belongs to this tenant before writing any row, same check the
    // single-booking sibling PUT /api/bookings/[id] already does. Without
    // this, a caller with bookings.edit could reassign one of their own
    // bookings to another tenant's client/team-member/service-type and
    // exfiltrate that row's PII via this route's own clients()/team_members()
    // joins on the response. Checked across the WHOLE batch before any write
    // runs, so a foreign id 404s the whole batch instead of partially applying.
    const fkChecks: Array<[string, string]> = []
    for (const u of updates as Array<{ id: string; data: Record<string, unknown> }>) {
      if (u.data?.client_id) fkChecks.push([u.data.client_id as string, 'clients'])
      if (u.data?.team_member_id) fkChecks.push([u.data.team_member_id as string, 'team_members'])
      if (u.data?.service_type_id) fkChecks.push([u.data.service_type_id as string, 'service_types'])
    }
    const seen = new Set<string>()
    for (const [fkId, table] of fkChecks) {
      const key = `${table}:${fkId}`
      if (seen.has(key)) continue
      seen.add(key)
      const { data: owned } = await supabaseAdmin
        .from(table)
        .select('id')
        .eq('id', fkId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!owned) {
        const field = table === 'clients' ? 'client_id' : table === 'team_members' ? 'team_member_id' : 'service_type_id'
        return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 })
      }
    }

    const results = await Promise.all(
      updates.map(async (u: { id: string; data: Record<string, unknown> }) => {
        const { data, error } = await supabaseAdmin
          .from('bookings')
          .update(u.data)
          .eq('id', u.id)
          .eq('tenant_id', tenantId)
          .select('*, clients(name, phone, email), team_members!bookings_team_member_id_fkey(name, phone, email)')
          .single()
        return { id: u.id, data, error }
      })
    )

    const failed = results.filter(r => r.error)
    if (failed.length > 0) {
      return NextResponse.json({
        error: `${failed.length}/${results.length} updates failed`,
        details: failed.map(f => ({ id: f.id, error: f.error?.message }))
      }, { status: 500 })
    }

    const first = results[0].data
    if (first) {
      const [dp, tp] = first.start_time.split('T')
      const [y, m, d] = dp.split('-').map(Number)
      const [h, min] = (tp || '00:00').split(':').map(Number)
      const bookingDate = new Date(y, m - 1, d, h, min).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const clientName = first.clients?.name || 'Client'

      await supabaseAdmin.from('notifications').insert({
        tenant_id: tenantId,
        type: notify_type || 'booking_updated',
        title: 'Series Updated',
        message: `${clientName} — ${results.length} bookings updated from ${bookingDate}`,
        booking_id: first.id,
        channel: 'in_app',
        recipient_type: 'admin',
        status: 'sent',
      })

      // Notify team member if rescheduled
      if (notify_type === 'rescheduled' && first.team_member_id) {
        await notify({
          tenantId,
          type: 'booking_reminder',
          title: 'Schedule Updated',
          message: `${clientName} — ${results.length} bookings rescheduled from ${bookingDate}`,
          channel: 'sms',
          recipientType: 'team_member',
          recipientId: first.team_member_id,
          bookingId: first.id,
        })
      }

      await audit({ tenantId, action: 'booking.batch_updated', entityType: 'booking', entityId: first.id, details: { count: results.length } })
    }

    return NextResponse.json({ updated: results.length })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
