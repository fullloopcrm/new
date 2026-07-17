import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import { pick } from '@/lib/validate'

const BATCH_UPDATE_FIELDS = [
  'client_id', 'team_member_id', 'service_type_id', 'service_type', 'recurring_type',
  'start_time', 'end_time', 'notes', 'special_instructions', 'status', 'hourly_rate',
  'pay_rate', 'actual_hours', 'team_pay', 'team_paid', 'discount_enabled', 'price',
]

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

    const db = tenantDb(tenantId)

    // Same allowlist + FK-injection guard already applied on PUT
    // /api/bookings/[id] and POST /api/bookings/batch: without it, a
    // caller-supplied client_id/team_member_id from another tenant would
    // leak that stranger's clients(*)/team_members(*) row via this route's
    // own post-update join, and (for team_member_id) fire a real
    // reschedule SMS to them below over this tenant's own Telnyx number.
    const sanitizedUpdates = (updates as { id: string; data: Record<string, unknown> }[]).map((u) => ({
      id: u.id,
      data: pick<Record<string, unknown>>(u.data, BATCH_UPDATE_FIELDS),
    }))

    const clientIds = [...new Set(sanitizedUpdates.map((u) => u.data.client_id).filter(Boolean))] as string[]
    const teamMemberIds = [...new Set(sanitizedUpdates.map((u) => u.data.team_member_id).filter(Boolean))] as string[]

    if (clientIds.length > 0) {
      const { data: ownedClients } = (await db.from('clients').select('id').in('id', clientIds)) as {
        data: { id: string }[] | null
      }
      const owned = new Set((ownedClients || []).map((c) => c.id))
      if (clientIds.some((id) => !owned.has(id))) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
    }
    if (teamMemberIds.length > 0) {
      const { data: ownedMembers } = (await db.from('team_members').select('id').in('id', teamMemberIds)) as {
        data: { id: string }[] | null
      }
      const owned = new Set((ownedMembers || []).map((m) => m.id))
      if (teamMemberIds.some((id) => !owned.has(id))) {
        return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      }
    }

    const results = await Promise.all(
      sanitizedUpdates.map(async (u) => {
        const { data, error } = await db
          .from('bookings')
          .update(u.data)
          .eq('id', u.id)
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
