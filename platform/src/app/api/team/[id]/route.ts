import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { pick } from '@/lib/validate'
import { audit } from '@/lib/audit'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ member: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json()
    const fields = pick(body, [
      'name', 'email', 'phone', 'role', 'hourly_rate', 'pay_rate', 'working_days', 'status',
      'preferred_language', 'notes', 'avatar_url', 'address', 'schedule', 'home_by_time',
      'has_car', 'labor_only', 'service_zones', 'max_travel_minutes',
    ])

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'team.updated', entityType: 'team_member', entityId: id })

    return NextResponse.json({ member: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('team.delete')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    // A team member with any booking history (past or future) can't be hard
    // deleted — bookings.team_member_id's FK rejects it, and even if it
    // didn't, deleting the row would blow away payout/audit history tied to
    // real completed jobs. booking_team_members (crew, not lead) is WORSE:
    // its FK is ON DELETE CASCADE, so a hard delete would silently wipe a
    // former crew member's job-history rows with no error at all. Deactivate
    // instead in both cases: same practical effect (gone from the active
    // roster, unassignable to new jobs) without destroying data.
    const [{ count: bookingCount }, { count: crewCount }] = await Promise.all([
      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('team_member_id', id),
      supabaseAdmin.from('booking_team_members').select('id', { count: 'exact', head: true }).eq('team_member_id', id),
    ])

    if ((bookingCount || 0) > 0 || (crewCount || 0) > 0) {
      const { data, error } = await supabaseAdmin
        .from('team_members')
        .update({ status: 'inactive' })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      await audit({ tenantId, action: 'team.deactivated', entityType: 'team_member', entityId: id, details: { reason: 'has_booking_history', booking_count: bookingCount, crew_count: crewCount } })

      return NextResponse.json({ success: true, deactivated: true, member: data })
    }

    const { error } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'team.deleted', entityType: 'team_member', entityId: id })

    return NextResponse.json({ success: true, deactivated: false })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
