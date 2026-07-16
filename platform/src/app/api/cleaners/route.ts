/**
 * Legacy nycmaid path — /api/cleaners reads/writes team_members.
 * Kept as thin compatibility shim so nycmaid-era code/frontends keep working.
 */
import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { geocodeAddress } from '@/lib/geo'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('team.view')
  if (authError) return authError

  // Excludes pin (portal-login credential), pay_rate/notes, and tax_* (SSN
  // last-4 + tax address) — this list endpoint is reachable by 'staff', the
  // lowest role, via team.view; those fields require team.edit (see [id]/route.ts).
  const { data, error } = await tenantDb(tenant.tenantId)
    .from('team_members')
    .select('id, tenant_id, name, email, phone, role, status, hourly_rate, priority, photo_url, address, calendar_color, schedule, unavailable_dates, working_days, working_start, working_end, max_jobs_per_day, notification_preferences, lat, lng, has_car, stripe_account_id, sms_consent, labor_only, stripe_ready_at, home_latitude, home_longitude, home_by_time, service_zones, avg_rating, rating_count, preferred_language, created_at, updated_at')
    .order('priority', { ascending: true, nullsFirst: false })
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('team.create')
  if (authError) return authError

  const body = await request.json()
  const { data, error } = await tenantDb(tenant.tenantId)
    .from('team_members')
    .insert({
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
        return tenantDb(tenant.tenantId)
          .from('team_members')
          .update({ home_latitude: coords.lat, home_longitude: coords.lng })
          .eq('id', data.id)
      }
    }).catch(() => {})
  }

  return NextResponse.json(data)
}
