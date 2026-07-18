import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import { pick } from '@/lib/validate'

const UPDATABLE_FIELDS = [
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

    // Allow-list writable fields (raw u.data was previously spread straight into
    // .update(), permitting mass-assignment of any column incl. tenant_id itself).
    const sanitized = updates.map((u: { id: string; data: Record<string, unknown> }) => ({
      id: u.id,
      data: pick<Record<string, unknown>>(u.data, [...UPDATABLE_FIELDS]),
    }))

    // client_id/team_member_id are caller-supplied; verify every id belongs to
    // this tenant before any write — the response joins clients(name, phone,
    // email)/team_members(name, phone, email), so a foreign id would otherwise
    // leak another tenant's PII in bulk.
    const candidateClientIds = Array.from(new Set(sanitized.map(u => u.data.client_id).filter((v): v is string => typeof v === 'string')))
    const candidateMemberIds = Array.from(new Set(sanitized.map(u => u.data.team_member_id).filter((v): v is string => typeof v === 'string')))
    if (candidateClientIds.length > 0) {
      const { data: ownedClients } = await supabaseAdmin.from('clients').select('id').eq('tenant_id', tenantId).in('id', candidateClientIds)
      const ownedIds = new Set((ownedClients || []).map(r => r.id))
      if (candidateClientIds.some(cid => !ownedIds.has(cid))) {
        return NextResponse.json({ error: 'Invalid client_id in updates array' }, { status: 404 })
      }
    }
    if (candidateMemberIds.length > 0) {
      const { data: ownedMembers } = await supabaseAdmin.from('team_members').select('id').eq('tenant_id', tenantId).in('id', candidateMemberIds)
      const ownedIds = new Set((ownedMembers || []).map(r => r.id))
      if (candidateMemberIds.some(mid => !ownedIds.has(mid))) {
        return NextResponse.json({ error: 'Invalid team_member_id in updates array' }, { status: 404 })
      }
    }

    // Mirror the completed/paid->cancelled guard on PUT /bookings/[id] (which
    // blocks it because there's no downstream reconciliation -- payroll
    // team_pay, referral commission clawback -- anywhere in this codebase).
    // This batch route accepts `status` in its own allow-list with no
    // equivalent check, so a bookings.edit-authenticated caller could cancel
    // an already-settled booking through this door even though the only
    // current UI caller (the "edit recurring series" flow) never sends
    // `status` at all.
    const cancelIds = sanitized.filter(u => u.data.status === 'cancelled').map(u => u.id)
    if (cancelIds.length > 0) {
      const { data: currentRows } = await supabaseAdmin
        .from('bookings')
        .select('id, status')
        .eq('tenant_id', tenantId)
        .in('id', cancelIds)
      const settled = (currentRows || []).filter(r => ['completed', 'paid'].includes(r.status))
      if (settled.length > 0) {
        return NextResponse.json(
          { error: `Cannot cancel a booking that is already completed or paid (${settled.map(r => r.id).join(', ')})` },
          { status: 400 },
        )
      }
    }

    const results = await Promise.all(
      sanitized.map(async (u) => {
        const isCancel = u.data.status === 'cancelled'
        let query = supabaseAdmin
          .from('bookings')
          .update(u.data)
          .eq('id', u.id)
          .eq('tenant_id', tenantId)
        // Atomic re-check: the settled-status guard above read a snapshot
        // before this write. A concurrent completion/payout landing in that
        // gap would otherwise still let the cancel through here.
        if (isCancel) query = query.not('status', 'in', '(completed,paid)')
        const selectQuery = query.select('*, clients(name, phone, email), team_members!bookings_team_member_id_fkey(name, phone, email)')
        if (isCancel) {
          const { data, error } = await selectQuery.maybeSingle()
          if (!error && !data) {
            return { id: u.id, data: null, error: { message: 'Booking state changed concurrently — cannot cancel a completed or paid booking' } }
          }
          return { id: u.id, data, error }
        }
        const { data, error } = await selectQuery.single()
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
