import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { generateToken } from '@/lib/tokens'
import { computeNaiveVisitWindow, generateRecurringDates, nowNaiveET, type RecurringType } from '@/lib/recurring'

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

// validate.ts has no enum type, so recurring_type is checked by hand here --
// mirrors the guard PUT /api/schedules/[id] already has. Without it, an
// invalid recurring_type stored via this admin creation route (BookingsAdmin
// UI, or a direct API caller) would fall through to generateRecurringDates'
// strict switch (no default case), which silently returns zero dates for the
// initial batch AND every future cron/generate-recurring refill -- the
// schedule quietly never generates a single booking, no error, no flag.
const VALID_RECURRING_TYPES = ['daily', 'weekly', 'biweekly', 'triweekly', 'monthly_date', 'monthly_weekday', 'custom']

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
        .in('status', ['scheduled', 'pending', 'confirmed'])
        .gte('start_time', nowNaiveET())
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
    invoice_consolidation,
    discount_percent,
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

  if (!VALID_RECURRING_TYPES.includes(recurring_type)) {
    return NextResponse.json({ error: `recurring_type must be one of: ${VALID_RECURRING_TYPES.join(', ')}` }, { status: 400 })
  }

  // 'per_visit' (default, standalone invoice per completed booking) or
  // 'monthly' (commercial/office accounts — one rollup statement, folded by
  // cron/generate-monthly-invoices).
  if (invoice_consolidation !== undefined && !['per_visit', 'monthly'].includes(invoice_consolidation)) {
    return NextResponse.json({ error: 'invoice_consolidation must be per_visit or monthly' }, { status: 400 })
  }

  // Confirm the client belongs to this tenant (prevents cross-tenant writes).
  const { data: clientRow } = await db
    .from('clients')
    .select('id')
    .eq('id', client_id)
    .single()
  if (!clientRow) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // property_id/team_member_id are cross-table FKs too -- same class of bug
  // already fixed on POST /api/bookings (fkChecks): an unvalidated FK here gets
  // carried onto every generated booking, then exfiltrated cross-tenant via the
  // client_properties()/team_members() joins that GET routes trust blindly.
  for (const [fkId, table] of [[property_id, 'client_properties'], [teamMemberId, 'team_members']] as const) {
    if (!fkId) continue
    const { data: owned } = await db.from(table).select('id').eq('id', fkId).maybeSingle()
    if (!owned) return NextResponse.json({ error: `Invalid ${table}` }, { status: 400 })
  }

  const resolvedDayOfWeek = day_of_week ?? new Date(start_date + 'T12:00:00').getDay()

  // Dates: use those provided by the frontend, else generate 6 weeks. Uses the
  // shared generateRecurringDates (same calendar-month / week-of-month
  // stepping every other recurring writer uses) rather than a flat
  // interval-day loop -- a flat step drifts monthly_date/monthly_weekday off
  // the client's actual contracted day within 1-2 cycles (e.g. "the 15th of
  // every month" landing on the 12th, then the 9th...), and also under-stepped
  // triweekly (28 days instead of 21) since this route's old intervalDays()
  // only special-cased weekly/biweekly.
  let dates: string[] = Array.isArray(body.dates)
    ? body.dates.filter((d: unknown): d is string => typeof d === 'string')
    : []
  if (dates.length === 0) {
    const startDt = new Date(start_date + 'T12:00:00')
    const horizon = new Date(startDt)
    horizon.setDate(horizon.getDate() + 42)
    dates = generateRecurringDates({
      recurringType: recurring_type as RecurringType,
      startDate: startDt,
      dayOfWeek: resolvedDayOfWeek,
      weeksToGenerate: 8, // upper bound on occurrences requested; filtered to the 42-day horizon below
    })
      .filter((d) => d <= horizon)
      .map((d) => d.toISOString().split('T')[0])
  }
  const lastInitialDate = dates.length > 0 ? dates[dates.length - 1] : null
  const sixWeeksOut = new Date(start_date + 'T12:00:00')
  sixWeeksOut.setDate(sixWeeksOut.getDate() + 42)
  const nextGenerateAfter = lastInitialDate || sixWeeksOut.toISOString().split('T')[0]

  // Only recurring_type 'custom' has an interval to capture -- every other
  // type's cadence is implied by the type itself (generateRecurringDates'
  // switch already knows how to step a 'weekly'/'monthly_date'/etc series).
  // 'custom' has NOWHERE ELSE this is ever persisted: the initial batch above
  // works off the frontend's own pre-computed `dates`, but cron/generate-
  // recurring's refill has no client in the loop and needs a stored interval
  // to invent more dates itself -- without this, custom-interval schedules
  // silently stop generating bookings forever once the initial batch runs
  // out (see 2026_07_17_recurring_schedules_custom_interval.sql). Derive it
  // from the actual gap between the first two computed dates, the same
  // ground truth used to create the bookings themselves.
  let customIntervalDays: number | null = null
  if (recurring_type === 'custom') {
    if (typeof body.custom_interval_days === 'number' && body.custom_interval_days > 0) {
      customIntervalDays = Math.round(body.custom_interval_days)
    } else if (dates.length >= 2) {
      const gapMs = new Date(dates[1] + 'T12:00:00').getTime() - new Date(dates[0] + 'T12:00:00').getTime()
      customIntervalDays = Math.round(gapMs / 86_400_000)
    }
  }

  const { data: schedule, error: scheduleErr } = await db
    .from('recurring_schedules')
    .insert({
      client_id,
      property_id: property_id || null,
      team_member_id: teamMemberId,
      recurring_type,
      custom_interval_days: customIntervalDays,
      day_of_week: resolvedDayOfWeek,
      preferred_time: preferred_time || null,
      duration_hours: hours,
      hourly_rate: hourly_rate || null,
      pay_rate: payRate,
      notes: notes || null,
      special_instructions: special_instructions || null,
      status: 'active',
      next_generate_after: nextGenerateAfter,
      invoice_consolidation: invoice_consolidation === 'monthly' ? 'monthly' : 'per_visit',
      discount_percent: discount_percent || null,
    })
    .select()
    .single()

  if (scheduleErr) return NextResponse.json({ error: scheduleErr.message }, { status: 500 })

  if (dates.length === 0) {
    return NextResponse.json({ schedule, bookings_created: 0 })
  }

  const { h, m } = parseTime(preferred_time)
  const rows = dates.map((date: string) => {
    const { startISO, endISO } = computeNaiveVisitWindow(date, h, m, hours)
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
      discount_percent: discount_percent || null,
    }
  })

  const { data: bookings, error: batchError } = await db
    .from('bookings')
    .insert(rows)
    .select('id')

  if (batchError) {
    return NextResponse.json({ error: batchError.message, schedule }, { status: 500 })
  }

  // GET /api/bookings/:id/team and closeout-summary source the lead from
  // booking_team_members, not bookings.team_member_id -- the initial batch
  // above stamped team_member_id on every generated booking but never created
  // the matching lead row, so a schedule created here with a team member
  // showed every one of its bookings as unassigned in the admin Team panel
  // and closeout payout attribution. Same booking_team_members-sync gap fixed
  // at every other bookings.team_member_id write site this session.
  if (teamMemberId && bookings && bookings.length > 0) {
    const teamRows = bookings.map((b) => ({
      tenant_id: tenantId, booking_id: b.id, team_member_id: teamMemberId, is_lead: true, position: 1,
    }))
    await db.from('booking_team_members').upsert(teamRows, { onConflict: 'booking_id,team_member_id' })
  }

  // No client/team notifications here by design (admin-only flow).
  return NextResponse.json({ schedule, bookings_created: bookings?.length || 0 })
}
