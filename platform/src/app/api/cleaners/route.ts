/**
 * Legacy nycmaid path — /api/cleaners reads/writes team_members.
 * Kept as thin compatibility shim so nycmaid-era code/frontends keep working.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { geocodeAddress } from '@/lib/geo'
import { isSafeImageUrl } from '@/lib/validate'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('team.view')
  if (authError) return authError

  const { data, error } = await supabaseAdmin
    .from('team_members')
    .select('*')
    .eq('tenant_id', tenant.tenantId)
    .order('priority', { ascending: true, nullsFirst: false })
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // pin is the team-portal login credential (plaintext 4-digit PIN). team.view
  // is held by every role down to 'staff' -- without stripping this, any
  // staff-tier dashboard user could pull every team member's PIN off this list
  // and log into the portal as anyone, including leads/managers.
  const safe = (data || []).map(({ pin: _pin, ...rest }) => rest)
  return NextResponse.json(safe)
}

export async function POST(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('team.create')
  if (authError) return authError

  const body = await request.json()
  if (body.photo_url && !isSafeImageUrl(body.photo_url)) {
    return NextResponse.json({ error: 'Invalid photo URL' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin
    .from('team_members')
    .insert({
      tenant_id: tenant.tenantId,
      name: body.name,
      email: body.email || null,
      phone: body.phone,
      address: body.address || null,
      working_days: body.working_days || [],
      schedule: body.schedule || {},
      unavailable_dates: body.unavailable_dates || [],
      pin: body.pin || null,
      hourly_rate: body.hourly_rate ?? 25,
      status: body.active === false ? 'inactive' : 'active',
      photo_url: body.photo_url || null,
      home_by_time: body.home_by_time || '18:00',
      service_zones: body.service_zones || [],
      has_car: body.has_car || false,
      calendar_color: body.calendar_color || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (data?.id && body.address) {
    geocodeAddress(body.address).then(coords => {
      if (coords) {
        return supabaseAdmin
          .from('team_members')
          .update({ home_latitude: coords.lat, home_longitude: coords.lng })
          .eq('id', data.id)
          .eq('tenant_id', tenant.tenantId)
      }
    }).catch(() => {})
  }

  return NextResponse.json(data)
}
