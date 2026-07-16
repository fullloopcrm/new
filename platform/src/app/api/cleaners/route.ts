/**
 * Legacy nycmaid path — /api/cleaners reads/writes team_members.
 * Kept as thin compatibility shim so nycmaid-era code/frontends keep working.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { geocodeAddress } from '@/lib/geo'

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

  // pin is a team-portal login credential, not roster data — strip it here,
  // same as /api/team's list endpoint. No consumer of this legacy shim
  // (dashboard/team, BookingsAdmin, jobs/crews) reads it, and team.view is
  // held by 'staff' by default, so leaving it in select('*') would let any
  // staff-tier dashboard user harvest every teammate's plaintext PIN.
  const team = (data || []).map(({ pin: _pin, ...rest }) => rest)

  return NextResponse.json(team)
}

export async function POST(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('team.create')
  if (authError) return authError

  const body = await request.json()
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
