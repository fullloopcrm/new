/**
 * Legacy nycmaid path — /api/cleaners/[id] shim over team_members.
 * PUT updates, DELETE nulls FKs then removes.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { geocodeAddress } from '@/lib/geo'
import { isPortalRole } from '@/lib/portal-rbac'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  const { id } = await params
  const body = await request.json()

  // NYC Maid parity: regenerate a team member's PIN and email it to them.
  // Gated to this tenant only — see src/lib/nycmaid/tenant.ts.
  if (isNycMaid(tenant.tenantId) && body.reset_pin) {
    const { data: member } = await supabaseAdmin.from('team_members').select('id, name, email').eq('id', id).eq('tenant_id', tenant.tenantId).single()
    if (!member) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    if (!member.email) return NextResponse.json({ error: 'Team member has no email on file' }, { status: 400 })

    const newPin = generatePin()
    const { error: updateError } = await supabaseAdmin.from('team_members').update({ pin: newPin }).eq('id', id).eq('tenant_id', tenant.tenantId)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    const result = await notify({
      tenantId: tenant.tenantId,
      type: 'portal_pin_reset',
      title: `Your PIN was reset: ${newPin}`,
      message: `Your new PIN is ${newPin}.`,
      channel: 'email',
      recipientType: 'team_member',
      recipientId: id,
      metadata: { recipientName: member.name, pin: newPin, portalUrl: tenant.tenant.website_url ? `${tenant.tenant.website_url}/team` : undefined },
    })
    await audit({ tenantId: tenant.tenantId, action: 'team.updated', entityType: 'team_member', entityId: id, details: { field: 'pin_reset' } })

    return NextResponse.json({ success: true, pin: newPin, emailed: result.success })
  }

  const today = new Date().toISOString().split('T')[0]
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

  await supabaseAdmin.from('bookings').update({ team_member_id: null }).eq('team_member_id', id).eq('tenant_id', tenantId)
  await supabaseAdmin.from('bookings').update({ suggested_team_member_id: null }).eq('suggested_team_member_id', id).eq('tenant_id', tenantId)
  await supabaseAdmin.from('recurring_schedules').update({ team_member_id: null }).eq('team_member_id', id).eq('tenant_id', tenantId)

  const { error } = await supabaseAdmin
    .from('team_members')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
