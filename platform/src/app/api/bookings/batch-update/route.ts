import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import { pick } from '@/lib/validate'

// Same allowlist as PUT /api/bookings/[id] — kept in sync so a batch edit can
// touch exactly the same fields a single edit can, no more.
const UPDATABLE_FIELDS = ['client_id', 'team_member_id', 'service_type_id', 'start_time', 'end_time', 'notes', 'special_instructions', 'status', 'hourly_rate', 'pay_rate', 'actual_hours', 'team_pay', 'team_paid', 'discount_enabled', 'price']

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

    // u.data used to be applied to .update() unfiltered — a caller-supplied
    // tenant_id in the payload would have re-tenanted the row (the WHERE
    // clause only gates WHICH row is touched, not what the SET clause can
    // contain). Allowlisted to the same fields PUT /api/bookings/[id] permits.
    const allowedUpdates = (updates as { id: string; data: Record<string, unknown> }[]).map((u) => ({
      id: u.id,
      data: pick(u.data, UPDATABLE_FIELDS),
    }))

    // client_id/team_member_id/service_type_id are caller-supplied FKs too —
    // clients/team_members/service_types have no cross-tenant FK check, and
    // this route's own response embeds clients(name, phone, email) +
    // team_members(name, phone, email) off the row, so a foreign id would
    // leak another tenant's PII in the response itself. Same guard as the
    // sibling PUT /api/bookings/[id] (register P11) — this batch route only
    // ever checked team_member_id, missing client_id and service_type_id.
    const requestedClientIds = Array.from(
      new Set(
        allowedUpdates
          .map((u) => u.data.client_id)
          .filter((x): x is string => typeof x === 'string' && x.length > 0),
      ),
    )
    if (requestedClientIds.length > 0) {
      const { data: validClients } = await supabaseAdmin
        .from('clients')
        .select('id')
        .in('id', requestedClientIds)
        .eq('tenant_id', tenantId)
      const validIds = new Set((validClients || []).map((c) => c.id))
      if (requestedClientIds.some((cid) => !validIds.has(cid))) {
        return NextResponse.json({ error: 'Invalid client selection' }, { status: 400 })
      }
    }

    const requestedMemberIds = Array.from(
      new Set(
        allowedUpdates
          .map((u) => u.data.team_member_id)
          .filter((x): x is string => typeof x === 'string' && x.length > 0),
      ),
    )
    if (requestedMemberIds.length > 0) {
      const { data: validMembers } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .in('id', requestedMemberIds)
        .eq('tenant_id', tenantId)
      const validIds = new Set((validMembers || []).map((m) => m.id))
      if (requestedMemberIds.some((mid) => !validIds.has(mid))) {
        return NextResponse.json({ error: 'Invalid team member selection' }, { status: 400 })
      }
    }

    const requestedServiceTypeIds = Array.from(
      new Set(
        allowedUpdates
          .map((u) => u.data.service_type_id)
          .filter((x): x is string => typeof x === 'string' && x.length > 0),
      ),
    )
    if (requestedServiceTypeIds.length > 0) {
      const { data: validServiceTypes } = await supabaseAdmin
        .from('service_types')
        .select('id')
        .in('id', requestedServiceTypeIds)
        .eq('tenant_id', tenantId)
      const validIds = new Set((validServiceTypes || []).map((s) => s.id))
      if (requestedServiceTypeIds.some((sid) => !validIds.has(sid))) {
        return NextResponse.json({ error: 'Invalid service type selection' }, { status: 400 })
      }
    }

    const results = await Promise.all(
      allowedUpdates.map(async (u) => {
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
