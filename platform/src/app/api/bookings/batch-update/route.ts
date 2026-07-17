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

    // Old team_member_id per booking, needed to detect a real reassignment
    // below — must be read BEFORE the update overwrites it.
    const teamChangeUpdates = sanitizedUpdates.filter((u) => 'team_member_id' in u.data)
    const oldTeamById = new Map<string, string | null>()
    if (teamChangeUpdates.length > 0) {
      const { data: oldRows } = (await db
        .from('bookings')
        .select('id, team_member_id')
        .in('id', teamChangeUpdates.map((u) => u.id))) as { data: { id: string; team_member_id: string | null }[] | null }
      for (const r of oldRows || []) oldTeamById.set(r.id, r.team_member_id ?? null)
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
      // item (117)'s own flagged-but-deferred instance: this reconstructed a
      // Date from start_time's raw UTC numeric components and rendered it
      // with no timeZone option, silently displaying the UTC calendar date
      // instead of the tenant's own — same bug class as (70)/(115)/(117),
      // just in a file that route's sweep didn't reach. Parse as a real
      // instant and render in the tenant's own zone instead.
      const bookingDate = new Date(first.start_time).toLocaleDateString('en-US', {
        timeZone: tenant.tenant?.timezone || 'America/New_York',
        weekday: 'short', month: 'short', day: 'numeric',
      })
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

      await audit({ tenantId, action: 'booking.batch_updated', entityType: 'booking', entityId: first.id, details: { count: results.length } })
    }

    // Reassignment across the batch — mirrors items (86)/(89)'s outgoing/
    // incoming notify-both-sides shape (PUT /api/bookings/[id]). This route
    // is BookingsAdmin's own "apply to all future bookings" series-edit path
    // and explicitly allows team_member_id in BATCH_UPDATE_FIELDS, so a
    // whole-series reassignment goes through here, not the single-booking
    // route. Two gaps this closes: the old code below only ever notified
    // the NEW tech, gated on `notify_type === 'rescheduled'` (set by the
    // caller only when the *time* shifted, not when the tech did — so a
    // pure reassignment with unchanged times notified no one) and only for
    // the first booking in the batch; the outgoing tech was never notified
    // at all, for any booking. Aggregated to one SMS per affected member
    // (not one per booking) to match this route's own "sends ONE
    // notification" design intent for series-wide edits.
    if (teamChangeUpdates.length > 0) {
      const resultById = new Map(results.map((r) => [r.id, r.data]))
      const outgoingCounts = new Map<string, number>()
      const incomingCounts = new Map<string, number>()
      for (const u of teamChangeUpdates) {
        const oldId = oldTeamById.get(u.id) ?? null
        const newId = (u.data.team_member_id as string | null) ?? null
        if (oldId === newId) continue
        if (oldId) outgoingCounts.set(oldId, (outgoingCounts.get(oldId) || 0) + 1)
        if (newId) incomingCounts.set(newId, (incomingCounts.get(newId) || 0) + 1)
      }

      if (outgoingCounts.size > 0) {
        const { data: outgoingMembers } = (await db
          .from('team_members')
          .select('id, phone')
          .in('id', [...outgoingCounts.keys()])) as { data: { id: string; phone: string | null }[] | null }
        for (const m of outgoingMembers || []) {
          const count = outgoingCounts.get(m.id) || 0
          if (!m.phone || count === 0) continue
          await notify({
            tenantId,
            type: 'booking_reminder',
            title: 'Jobs Reassigned',
            message: `${count} of your upcoming job${count === 1 ? '' : 's'} ${count === 1 ? 'has' : 'have'} been reassigned to another team member.`,
            channel: 'sms',
            recipientType: 'team_member',
            recipientId: m.id,
          }).catch((err) => console.error('Batch reassignment-removal notify error:', err))
        }
      }

      for (const [newId, count] of incomingCounts) {
        const anyBookingForMember = teamChangeUpdates.find((u) => (u.data.team_member_id as string | null) === newId)
        const bookingId = anyBookingForMember ? resultById.get(anyBookingForMember.id)?.id : undefined
        await notify({
          tenantId,
          type: 'booking_reminder',
          title: 'New Jobs Assigned',
          message: `You've been assigned ${count} upcoming job${count === 1 ? '' : 's'}.`,
          channel: 'sms',
          recipientType: 'team_member',
          recipientId: newId,
          bookingId,
        }).catch((err) => console.error('Batch reassignment-assignment notify error:', err))
      }
    }

    return NextResponse.json({ updated: results.length })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
