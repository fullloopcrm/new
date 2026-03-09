import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { audit } from '@/lib/audit'

/**
 * Batch update multiple bookings in parallel.
 * Sends ONE notification (for the first booking).
 * Used for "all future bookings" edits on recurring series.
 *
 * PUT /api/bookings/batch-update
 * Body: { updates: [{ id: "uuid", data: { start_time, end_time, ... } }] }
 */
export async function PUT(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { updates } = await request.json()

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array required' }, { status: 400 })
    }

    const results = await Promise.all(
      updates.map(async (u: { id: string; data: Record<string, unknown> }) => {
        const { data, error } = await supabaseAdmin
          .from('bookings')
          .update(u.data)
          .eq('id', u.id)
          .eq('tenant_id', tenantId)
          .select('*, clients(name), team_members(name)')
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

      await supabaseAdmin.from('notifications').insert({
        tenant_id: tenantId,
        type: 'booking_updated',
        title: 'Series Updated',
        message: `${first.clients?.name || 'Client'} - ${results.length} bookings updated from ${bookingDate}`,
        booking_id: first.id,
        channel: 'dashboard',
        recipient_type: 'admin',
      })

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
