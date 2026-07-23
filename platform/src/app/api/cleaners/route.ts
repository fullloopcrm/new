/**
 * Legacy nycmaid path — /api/cleaners reads/writes team_members.
 * Kept as thin compatibility shim so nycmaid-era code/frontends keep working.
 */
import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { geocodeAddress } from '@/lib/geo'
import { supabaseAdmin } from '@/lib/supabase'
import { etToday, addCalendarDays, formatNaiveET, calendarDayOfWeek } from '@/lib/recurring'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('team.view')
  if (authError) return authError

  const { data, error } = await tenantDb(tenant.tenantId)
    .from('team_members')
    .select('*')
    .order('priority', { ascending: true, nullsFirst: false })
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Roster stats (jobs/hours this week, lifetime LTV) used to be computed
  // client-side from `/api/bookings?limit=500` with no team_member_id filter
  // and no date bound — sorted by start_time DESC, so on a tenant with
  // thousands of bookings (recurring generation runs years ahead) that
  // 500-row window was entirely far-future scheduled/cancelled rows,
  // containing zero completed jobs. Every member showed 0 jobs/hours/LTV
  // regardless of real activity. Computed properly here instead, scoped
  // and bounded per query rather than one unbounded global fetch.
  const todayCal = etToday()
  const dow = calendarDayOfWeek(todayCal)
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const weekStartNaive = `${formatNaiveET(addCalendarDays(todayCal, mondayOffset))}Z`
  const weekEndNaive = `${formatNaiveET(addCalendarDays(todayCal, mondayOffset + 7))}Z`

  const [{ data: weekBookings }, { data: ltvBookings }] = await Promise.all([
    supabaseAdmin.from('bookings').select('team_member_id, start_time, end_time')
      .eq('tenant_id', tenant.tenantId).not('team_member_id', 'is', null)
      .gte('start_time', weekStartNaive).lt('start_time', weekEndNaive),
    supabaseAdmin.from('bookings').select('team_member_id, price')
      .eq('tenant_id', tenant.tenantId).not('team_member_id', 'is', null)
      .in('status', ['completed', 'paid']),
  ])

  const weekStats = new Map<string, { jobs: number; hours: number }>()
  for (const b of weekBookings || []) {
    const tmId = b.team_member_id as string
    const hours = b.end_time
      ? Math.max(0.5, (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 3_600_000)
      : 3
    const cur = weekStats.get(tmId) || { jobs: 0, hours: 0 }
    cur.jobs += 1
    cur.hours += hours
    weekStats.set(tmId, cur)
  }

  const ltvByMember = new Map<string, number>()
  for (const b of ltvBookings || []) {
    const tmId = b.team_member_id as string
    ltvByMember.set(tmId, (ltvByMember.get(tmId) || 0) + (b.price || 0))
  }

  const enriched = (data || []).map((m) => ({
    ...m,
    jobs_this_week: weekStats.get(m.id)?.jobs || 0,
    hours_this_week: Math.round((weekStats.get(m.id)?.hours || 0) * 10) / 10,
    ltv_total_cents: ltvByMember.get(m.id) || 0,
  }))

  return NextResponse.json(enriched)
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
