/**
 * Route by id — read, update (stops reorder, status), delete.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { getTerminatedTeamMemberIds } from '@/lib/hr'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('routes')
      .select('*, team_members(id, name, phone, home_latitude, home_longitude)')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ route: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/routes/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    const assignables = [
      'team_member_id', 'route_date', 'status',
      'start_address', 'start_latitude', 'start_longitude',
      'end_address', 'end_latitude', 'end_longitude',
      'scheduled_start_time',
      'stops',
      'total_distance_meters', 'total_duration_seconds',
    ] as const
    for (const k of assignables) if (k in body) updates[k] = body[k]

    // team_member_id is a caller-supplied FK — team_members has no cross-tenant
    // FK check, and GET /api/routes(/[id]) embeds team_members(name, phone,
    // home_lat/lng) unscoped by tenant off this column, so a foreign id would
    // leak another tenant's employee name/phone/home address on the next read
    // (and POST /api/routes/[id]/publish would text that foreign employee via
    // this tenant's own SMS account). POST /api/routes already verifies this
    // FK before insert; this PATCH path let it through unchecked.
    if ('team_member_id' in updates && updates.team_member_id) {
      const { data: tm } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('id', updates.team_member_id as string)
        .maybeSingle()
      if (!tm) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      // Same class of gap this route's own POST-side comment above flags for
      // the FK check: reassigning a route to a team member the business
      // already let go was never blocked here either.
      const terminatedIds = await getTerminatedTeamMemberIds(tenantId, [updates.team_member_id as string])
      if (terminatedIds.length > 0) {
        return NextResponse.json({ error: 'This team member is no longer active and cannot be assigned.' }, { status: 400 })
      }
    }

    if ('stops' in body && Array.isArray(body.stops)) {
      updates.total_stops = body.stops.length
    }

    if (body.status === 'started' && !body.started_at) {
      updates.started_at = new Date().toISOString()
    }
    if (body.status === 'completed' && !body.completed_at) {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('routes')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error

    // Sync booking.route_id back-links if stops changed
    if (Array.isArray(body.stops)) {
      const bookingIds: string[] = body.stops
        .map((s: { booking_id?: string }) => s.booking_id)
        .filter((x: string | undefined): x is string => !!x)
      await supabaseAdmin
        .from('bookings')
        .update({ route_id: null })
        .eq('tenant_id', tenantId)
        .eq('route_id', id)
      if (bookingIds.length) {
        await supabaseAdmin
          .from('bookings')
          .update({ route_id: id })
          .eq('tenant_id', tenantId)
          .in('id', bookingIds)
      }
    }

    return NextResponse.json({ route: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/routes/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    // Unlink bookings
    await supabaseAdmin
      .from('bookings')
      .update({ route_id: null })
      .eq('tenant_id', tenantId)
      .eq('route_id', id)

    const { error } = await supabaseAdmin
      .from('routes')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/routes/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
