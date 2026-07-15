import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { generateToken } from '@/lib/tokens'

// Admin recurring-schedules management. Ported from standalone nycmaid
// (/api/admin/recurring-schedules), tenant-scoped for FullLoop and
// ADMIN-ONLY: client SMS/email/push notifications are intentionally
// suppressed (Jeff's call — see feedback_no_client_sms). The admin manages
// the schedule + its bookings quietly; the client-initiated flow
// (/api/client/recurring) is where confirmations are sent.
//
// Column mapping vs nycmaid: cleaner_id -> team_member_id, cleaner_pay_rate
// -> pay_rate, cleaner_token -> team_member_token. Every query is scoped by
// tenant_id.

// Normalize "HH:MM" / "HH:MM:SS" / "h:MM AM/PM" -> canonical { h, m }.
function parseTime(raw: string | null | undefined): { h: number; m: number } {
  const s = String(raw || '09:00')
  const match = s.match(/(\d{1,2})\D+(\d{2})/)
  const ampm = s.match(/(am|pm)\b/i)
  let h = match ? parseInt(match[1], 10) : 9
  const m = match ? parseInt(match[2], 10) : 0
  if (ampm) {
    const isPM = ampm[1].toLowerCase() === 'pm'
    if (isPM && h < 12) h += 12
    if (!isPM && h === 12) h = 0
  }
  return { h: h % 24, m: m % 60 }
}

function intervalDays(recurringType: string): number {
  return recurringType === 'weekly' ? 7 : recurringType === 'biweekly' ? 14 : 28
}

export async function GET(request: Request) {
  const { tenant, error } = await requirePermission('schedules.view')
  if (error) return error
  const { tenantId } = tenant
  const db = tenantDb(tenantId)

  const url = new URL(request.url)
  const clientId = url.searchParams.get('client_id')

  let query = db
    .from('recurring_schedules')
    .select('*, clients(id, name, phone, address), team_members(id, name)')
    .order('created_at', { ascending: false })
  if (clientId) query = query.eq('client_id', clientId)

  const { data, error: qErr } = await query
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  // Attach next upcoming booking date per schedule.
  const withNext = await Promise.all(
    (data || []).map(async (schedule: { id: string }) => {
      const { data: nextBooking } = await db
        .from('bookings')
        .select('start_time')
        .eq('schedule_id', schedule.id)
        .in('status', ['scheduled', 'pending'])
        .gte('start_time', new Date().toISOString())
        .order('start_time')
        .limit(1)
        .single()
      return { ...schedule, next_booking_date: nextBooking?.start_time || null }
    })
  )

  return NextResponse.json(withNext)
}

export async function POST(request: Request) {
  const { tenant, error } = await requirePermission('schedules.create')
  if (error) return error
  const { tenantId } = tenant
  const db = tenantDb(tenantId)

  const body = await request.json()
  const {
    client_id,
    property_id,
    team_member_id,
    cleaner_id, // nycmaid alias
    recurring_type,
    day_of_week,
    preferred_time,
    duration_hours,
    hourly_rate,
    pay_rate,
    cleaner_pay_rate, // nycmaid alias
    notes,
    special_instructions,
    start_date,
    price,
    service_type,
    status: bookingStatus,
  } = body

  const teamMemberId = team_member_id || cleaner_id || null
  const payRate = pay_rate ?? cleaner_pay_rate ?? null
  const hours = duration_hours || 3

  if (!client_id || !recurring_type || !start_date) {
    return NextResponse.json(
      { error: 'client_id, recurring_type, and start_date are required' },
      { status: 400 }
    )
  }

  // Confirm client_id/property_id/team_member_id (if given) belong to this
  // tenant -- otherwise a foreign id gets its name/address pulled into this
  // schedule (and every generated booking) via the clients()/team_members()
  // joins on GET here and the client_properties()/team_members() joins on
  // GET /api/bookings, a cross-tenant PII leak (same class fixed on the
  // plain schedules route in 4c0e3635).
  const { data: clientRow } = await db
    .from('clients')
    .select('id')
    .eq('id', client_id)
    .eq('tenant_id', tenantId)
    .single()
  if (!clientRow) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // A caller-supplied team_member_id/cleaner_id must belong to THIS tenant —
  // team_members has no cross-tenant FK check, so without this a tenant admin
  // could create a recurring schedule (and every generated booking) assigned
  // to another tenant's employee. Same bug class as [id]/route.ts PUT and
  // [id]/exception/route.ts POST.
  if (teamMemberId) {
    const { data: memberRow } = await db
      .from('team_members')
      .select('id')
      .eq('id', teamMemberId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!memberRow) return NextResponse.json({ error: 'Invalid team member' }, { status: 400 })
  }

  // A caller-supplied property_id must belong to THIS client + tenant —
  // client_properties has its own tenant_id and no cross-tenant FK check.
  // GET /api/bookings embeds client_properties(*) unscoped by tenant off
  // bookings.property_id, so a foreign id here would leak another tenant's
  // client address/lat-long on every subsequent booking list read. Same
  // guard already applied to POST /api/client/recurring; this sibling
  // admin route accepted the id verbatim.
  if (property_id) {
    const { data: propertyRow } = await db
      .from('client_properties')
      .select('id')
      .eq('id', property_id)
      .eq('client_id', client_id)
      .maybeSingle()
    if (!propertyRow) return NextResponse.json({ error: 'Invalid property selection' }, { status: 400 })
  }

  // Dates: use those provided by the frontend, else generate 6 weeks.
  let dates: string[] = Array.isArray(body.dates)
    ? body.dates.filter((d: unknown): d is string => typeof d === 'string')
    : []
  if (dates.length === 0) {
    const step = intervalDays(recurring_type)
    const startDt = new Date(start_date + 'T12:00:00')
    const horizon = new Date(startDt)
    horizon.setDate(horizon.getDate() + 42)
    for (let d = new Date(startDt); d <= horizon; d.setDate(d.getDate() + step)) {
      dates.push(d.toISOString().split('T')[0])
    }
  }
  const lastInitialDate = dates.length > 0 ? dates[dates.length - 1] : null
  const sixWeeksOut = new Date(start_date + 'T12:00:00')
  sixWeeksOut.setDate(sixWeeksOut.getDate() + 42)
  const nextGenerateAfter = lastInitialDate || sixWeeksOut.toISOString().split('T')[0]

  const { data: schedule, error: scheduleErr } = await db
    .from('recurring_schedules')
    .insert({
      client_id,
      property_id: property_id || null,
      team_member_id: teamMemberId,
      recurring_type,
      day_of_week: day_of_week ?? new Date(start_date + 'T12:00:00').getDay(),
      preferred_time: preferred_time || null,
      duration_hours: hours,
      hourly_rate: hourly_rate || null,
      pay_rate: payRate,
      notes: notes || null,
      special_instructions: special_instructions || null,
      status: 'active',
      next_generate_after: nextGenerateAfter,
    })
    .select()
    .single()

  if (scheduleErr) return NextResponse.json({ error: scheduleErr.message }, { status: 500 })

  if (dates.length === 0) {
    return NextResponse.json({ schedule, bookings_created: 0 })
  }

  const { h, m } = parseTime(preferred_time)
  const rows = dates.map((date: string) => {
    const startISO = `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    const endTotalMin = h * 60 + m + hours * 60
    const endISO = `${date}T${String(Math.floor(endTotalMin / 60) % 24).padStart(2, '0')}:${String(endTotalMin % 60).padStart(2, '0')}:00`
    const token = generateToken()
    const tokenExpires = new Date(startISO)
    tokenExpires.setHours(tokenExpires.getHours() + 24)
    return {
      client_id,
      property_id: property_id || null,
      team_member_id: teamMemberId,
      start_time: startISO,
      end_time: endISO,
      service_type: service_type || 'Standard Cleaning',
      price: price || 0,
      hourly_rate: hourly_rate || null,
      pay_rate: payRate,
      notes: notes || null,
      recurring_type,
      team_member_token: token,
      token_expires_at: tokenExpires.toISOString(),
      status: bookingStatus || 'scheduled',
      schedule_id: schedule.id,
    }
  })

  const { data: bookings, error: batchError } = await db
    .from('bookings')  // tenant-scope-ok: insert rows carry tenant_id (built above)
    .insert(rows)
    .select('id')

  if (batchError) {
    return NextResponse.json({ error: batchError.message, schedule }, { status: 500 })
  }

  // No client/team notifications here by design (admin-only flow).
  return NextResponse.json({ schedule, bookings_created: bookings?.length || 0 })
}
