import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { pick } from '@/lib/validate'
import { findForeignRef } from '@/lib/verify-tenant-refs'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'

// Columns a batch update is allowed to set. Excludes tenant_id/id so a caller
// can't mass-assign a booking into another tenant.
const BATCH_UPDATE_FIELDS = [
  'client_id', 'team_member_id', 'service_type_id', 'start_time', 'end_time',
  'notes', 'special_instructions', 'status', 'hourly_rate', 'pay_rate',
  'actual_hours', 'team_pay', 'team_paid', 'discount_enabled', 'price',
] as const

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

    // Whitelist settable columns (drops tenant_id/id so a booking can't be
    // reassigned to another tenant via mass-assignment).
    const sanitized = updates.map((u: { id: string; data: Record<string, unknown> }) => ({
      id: u.id,
      data: pick(u.data || {}, BATCH_UPDATE_FIELDS as unknown as string[]),
    }))

    // Reject any FK id that isn't this tenant's, across all updates.
    const uniq = (vals: unknown[]): string[] =>
      [...new Set(vals.filter((v): v is string => typeof v === 'string' && v.length > 0))]
    const foreign = await findForeignRef(tenantId, [
      { table: 'clients', ids: uniq(sanitized.map(u => u.data.client_id)) },
      { table: 'team_members', ids: uniq(sanitized.map(u => u.data.team_member_id)) },
      { table: 'service_types', ids: uniq(sanitized.map(u => u.data.service_type_id)) },
    ])
    if (foreign) {
      return NextResponse.json({ error: `Unknown ${foreign.table.replace(/s$/, '').replace(/_/g, ' ')} for this account` }, { status: 400 })
    }

    const results = await Promise.all(
      sanitized.map(async (u: { id: string; data: Record<string, unknown> }) => {
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
