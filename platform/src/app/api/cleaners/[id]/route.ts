/**
 * Legacy nycmaid path — /api/cleaners/[id] shim over team_members.
 * PUT updates, DELETE nulls FKs then removes.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { geocodeAddress } from '@/lib/geo'
import { isPortalRole } from '@/lib/portal-rbac'
import { notify } from '@/lib/notify'

// Bookings still in one of these statuses have no completed-work history to
// preserve — safe to unassign on delete. Anything else (completed/paid/
// cancelled/no_show) keeps its team_member_id: finance/tax-export,
// finance/cleaner-income, and finance/payroll-prep all key off this FK for a
// departed employee's past-work attribution (1099s, income reports) — nulling
// it on delete would silently erase that history right when it matters most.
const UNASSIGNABLE_ON_DELETE_STATUSES = ['pending', 'scheduled', 'confirmed', 'in_progress']

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  const { id } = await params
  const body = await request.json()

  const today = new Date().toLocaleDateString('en-CA', { timeZone: tenant.tenant?.timezone || 'America/New_York' })
  const futureDates = (body.unavailable_dates || []).filter((d: string) => d >= today)

  const update: Record<string, unknown> = {
    name: body.name,
    phone: body.phone,
    email: body.email || null,
    address: body.address ?? undefined,
    photo_url: body.photo_url || null,
    working_days: body.working_days || [],
    schedule: body.schedule ?? undefined,
    working_start: body.working_start || '09:00',
    working_end: body.working_end || '17:00',
    unavailable_dates: futureDates,
    pin: body.pin ?? undefined,
    hourly_rate: body.hourly_rate ?? undefined,
    home_by_time: body.home_by_time ?? undefined,
    max_jobs_per_day: body.max_jobs_per_day ?? undefined,
    service_zones: body.service_zones ?? undefined,
    has_car: body.has_car ?? undefined,
    calendar_color: body.calendar_color ?? undefined,
  }
  if (body.active !== undefined) update.status = body.active ? 'active' : 'inactive'
  // Field-staff portal tier (worker/lead/manager) — drives portal permissions.
  if (body.role !== undefined) {
    if (!isPortalRole(body.role)) {
      return NextResponse.json({ error: 'Invalid role. Must be: worker, lead, manager' }, { status: 400 })
    }
    update.role = body.role
  }

  const { data, error } = await supabaseAdmin
    .from('team_members')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', tenant.tenantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.address) {
    geocodeAddress(body.address).then(coords => {
      if (coords) {
        return supabaseAdmin
          .from('team_members')
          .update({ home_latitude: coords.lat, home_longitude: coords.lng })
          .eq('id', id)
          .eq('tenant_id', tenant.tenantId)
      }
    }).catch(() => {})
  }

  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('team.delete')
  if (authError) return authError

  const { id } = await params
  const tenantId = tenant.tenantId

  // Upcoming/in-flight bookings lose their assigned tech and need a human to
  // reassign them — nobody was ever told this happened before now.
  const { data: unassigned } = await supabaseAdmin
    .from('bookings')
    .select('id, start_time, clients(name)')
    .eq('team_member_id', id)
    .eq('tenant_id', tenantId)
    .in('status', UNASSIGNABLE_ON_DELETE_STATUSES)

  await supabaseAdmin.from('bookings').update({ team_member_id: null }).eq('team_member_id', id).eq('tenant_id', tenantId).in('status', UNASSIGNABLE_ON_DELETE_STATUSES)
  await supabaseAdmin.from('bookings').update({ suggested_team_member_id: null }).eq('suggested_team_member_id', id).eq('tenant_id', tenantId)
  await supabaseAdmin.from('recurring_schedules').update({ team_member_id: null }).eq('team_member_id', id).eq('tenant_id', tenantId)

  const { data: memberRow } = await supabaseAdmin.from('team_members').select('name').eq('id', id).eq('tenant_id', tenantId).single()

  const { error } = await supabaseAdmin
    .from('team_members')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (unassigned && unassigned.length > 0) {
    const memberName = memberRow?.name || 'Deleted team member'
    await notify({
      tenantId,
      type: 'lifecycle_change',
      title: `${memberName} deleted — ${unassigned.length} job${unassigned.length === 1 ? '' : 's'} need reassignment`,
      message: `${unassigned.length} upcoming booking${unassigned.length === 1 ? '' : 's'} lost their assigned team member and now need a new one.`,
      channel: 'email',
      recipientType: 'admin',
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
