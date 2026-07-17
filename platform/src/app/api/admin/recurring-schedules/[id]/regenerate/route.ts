import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { generateToken } from '@/lib/tokens'
import { computeNaiveVisitWindow, nowNaiveET } from '@/lib/recurring'

// Atomic "edit recurring pattern" for a series. Replaces the old client-side
// loop (delete-each future booking, then create-each new one — N+N requests,
// fragile, partial-failure prone) with ONE server call:
//   1. update the schedule rule (pattern/time/member/rate)
//   2. hard-delete this series' FUTURE scheduled/pending bookings from `from_date`
//      (never touches completed/paid/cancelled history — same scope the client
//      loop deleted, just set-based)
//   3. insert the new pattern's bookings (carrying the schedule's property_id)
// Tenant-scoped, admin-only, no client notifications (admin-managed flow).

// Sibling routes (POST ../route.ts, PUT ../[id]/route.ts) both guard
// recurring_type against this exact allowlist -- this route wrote
// body.recurring_type straight onto the schedule rule with no check, so an
// invalid value (e.g. a display string like 'Weekly' instead of the raw
// 'weekly') silently zeroes out cron/generate-recurring's date math
// (generateRecurringDates' switch falls through every case) with no error.
const VALID_RECURRING_TYPES = ['daily', 'weekly', 'biweekly', 'triweekly', 'monthly_date', 'monthly_weekday', 'custom']

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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error } = await requirePermission('schedules.edit')
  if (error) return error
  const { tenantId } = tenant
  const { id } = await params

  const body = await request.json()
  const {
    recurring_type,
    day_of_week,
    preferred_time,
    duration_hours,
    hourly_rate,
    pay_rate,
    cleaner_pay_rate, // nycmaid alias
    team_member_id,
    cleaner_id, // nycmaid alias
    notes,
    service_type,
    price,
    status: bookingStatus,
    from_date, // ISO/naive cutoff: cancel + regenerate from here forward
  } = body

  const dates: string[] = Array.isArray(body.dates)
    ? body.dates.filter((d: unknown): d is string => typeof d === 'string')
    : []
  if (dates.length === 0) {
    return NextResponse.json({ error: 'dates[] required' }, { status: 400 })
  }

  if (recurring_type !== undefined && !VALID_RECURRING_TYPES.includes(recurring_type)) {
    return NextResponse.json({ error: `recurring_type must be one of: ${VALID_RECURRING_TYPES.join(', ')}` }, { status: 400 })
  }

  // Distinguish "caller didn't send this field" from "caller explicitly wants
  // to unassign" (team_member_id: null) -- team_member_id ?? cleaner_id ?? null
  // collapsed both cases to null, so an explicit unassign (a real, supported
  // state elsewhere: cron/generate-recurring creates unassigned+flagged
  // bookings the same way) silently failed to clear the rule below, matching
  // ../route.ts PUT's already-correct `!== undefined` handling of this same field.
  const teamMemberProvided = team_member_id !== undefined || cleaner_id !== undefined
  const teamMemberId = team_member_id !== undefined ? team_member_id : (cleaner_id ?? null)
  const payRate = pay_rate ?? cleaner_pay_rate ?? null
  const hours = duration_hours || 3

  const db = tenantDb(tenantId)

  // Confirm the schedule belongs to this tenant; pull client_id + property_id to
  // preserve them on the regenerated bookings.
  const { data: schedule } = await db
    .from('recurring_schedules')
    .select('id, client_id, property_id, pay_rate, hourly_rate, recurring_type, team_size')
    .eq('id', id)
    .single()
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })

  // Fall back to the schedule's stored rates when the caller omits them, so an
  // edit that doesn't resend pay_rate can't zero out cleaner payout.
  const effPayRate = payRate ?? schedule.pay_rate ?? null
  const effHourlyRate = hourly_rate ?? schedule.hourly_rate ?? null

  // team_member_id is a cross-table FK -- same class of bug already fixed on
  // POST /api/bookings (fkChecks): an unvalidated FK here gets carried onto
  // every regenerated booking, then exfiltrated cross-tenant via the
  // team_members() join that GET routes trust blindly.
  if (teamMemberId) {
    const { data: owned } = await db.from('team_members').select('id').eq('id', teamMemberId).maybeSingle()
    if (!owned) return NextResponse.json({ error: 'Invalid team_members' }, { status: 400 })
  }

  const lastDate = dates[dates.length - 1]

  // 1. Update the rule.
  const rulePatch: Record<string, unknown> = { updated_at: new Date().toISOString(), next_generate_after: lastDate }
  if (recurring_type !== undefined) rulePatch.recurring_type = recurring_type
  // Re-derive custom_interval_days whenever this edit's effective type is
  // 'custom' -- same reasoning as POST ../route.ts: cron/generate-recurring's
  // refill has no client in the loop and needs this stored to invent more
  // dates. An edit that changes the cadence (e.g. every-2-weeks -> every-3-
  // weeks) but doesn't refresh this would leave cron refilling at the STALE
  // interval forever, silently drifting from what the admin just set.
  const effRecurringType = recurring_type !== undefined ? recurring_type : schedule.recurring_type
  if (effRecurringType === 'custom' && dates.length >= 2) {
    const gapMs = new Date(dates[1] + 'T12:00:00').getTime() - new Date(dates[0] + 'T12:00:00').getTime()
    rulePatch.custom_interval_days = Math.round(gapMs / 86_400_000)
  }
  if (day_of_week !== undefined) rulePatch.day_of_week = day_of_week
  if (preferred_time !== undefined) rulePatch.preferred_time = preferred_time
  if (duration_hours !== undefined) rulePatch.duration_hours = hours
  if (hourly_rate !== undefined) rulePatch.hourly_rate = hourly_rate
  if (payRate !== null) rulePatch.pay_rate = effPayRate
  if (teamMemberProvided) rulePatch.team_member_id = teamMemberId
  if (notes !== undefined) rulePatch.notes = notes
  await db.from('recurring_schedules').update(rulePatch).eq('id', id)

  // 2. Capture the OLD future not-yet-serviced bookings (scheduled/pending/
  // confirmed) from the cutoff forward. Completed/paid/cancelled rows are
  // never touched. We delete these by id AFTER the new insert succeeds, so a
  // failed insert leaves the existing series fully intact (no destructive
  // window).
  //
  // Same ET/UTC gap bug class fixed elsewhere in this session: start_time is
  // naive-ET (see ../route.ts's own nowNaiveET() usage), so the caller-omitted
  // fallback must anchor to ET now, not a true-UTC new Date().toISOString() --
  // otherwise the rolling multi-hour gap window either leaves a stale
  // duplicate booking un-retired or wrongly retires one that hasn't happened.
  const cutoff = from_date || nowNaiveET()
  const { data: oldRows } = await db
    .from('bookings')
    .select('id, price')
    .eq('schedule_id', id)
    .in('status', ['scheduled', 'pending', 'confirmed'])
    .gte('start_time', cutoff)
  const oldIds = (oldRows || []).map((r: { id: string }) => r.id)

  // recurring_schedules has no `price` column to fall back to the way
  // effPayRate/effHourlyRate do above -- price only ever lived per-booking.
  // `price: price || 0` used to apply unconditionally, so a caller that
  // edits the pattern (day/time/member) without resending price (nothing
  // today forces it) silently zeroed every regenerated booking's price --
  // the same "edit without resending zeroes the field" bug already fixed
  // for pay_rate/hourly_rate in this exact route, just missed for price.
  // Falls back to the price already on the series' own future bookings
  // (the ones this call is about to retire) when the caller omits it.
  const fallbackPrice = oldRows?.[0]?.price ?? 0

  // 3. Insert the new pattern.
  const { h, m } = parseTime(preferred_time)
  const rows = dates.map((date: string) => {
    const { startISO, endISO } = computeNaiveVisitWindow(date, h, m, hours)
    const token = generateToken()
    const tokenExpires = new Date(startISO)
    tokenExpires.setHours(tokenExpires.getHours() + 24)
    return {
      tenant_id: tenantId,
      client_id: schedule.client_id,
      property_id: schedule.property_id || null,
      team_member_id: teamMemberId,
      start_time: startISO,
      end_time: endISO,
      service_type: service_type || 'Standard Cleaning',
      price: price !== undefined ? (Number(price) || 0) : fallbackPrice,
      hourly_rate: effHourlyRate,
      pay_rate: effPayRate,
      notes: notes || null,
      // effRecurringType (not the raw, possibly-omitted `recurring_type`) --
      // same fallback-to-existing-value fix already applied to pay_rate/
      // hourly_rate/price above. bookings.recurring_type isn't cosmetic:
      // BookingsAdmin's "apply to all" sibling match
      // (`b.recurring_type === editingBooking.recurring_type`) and its list
      // badges both key off it, so an edit that omits recurring_type (any
      // caller other than today's one UI call site, which happens to always
      // resend it) would silently null every regenerated booking's series
      // membership instead of keeping the schedule's actual type.
      recurring_type: effRecurringType,
      // Carried forward from the schedule, same fallback class as
      // pay_rate/hourly_rate/price/recurring_type above -- this route has no
      // team_size input, so an edit here must not silently drop a
      // client-set crew size back to solo (see
      // 2026_07_17_recurring_schedules_team_size.sql).
      team_size: schedule.team_size ?? null,
      team_member_token: token,
      token_expires_at: tokenExpires.toISOString(),
      status: bookingStatus || 'scheduled',
      schedule_id: id,
    }
  })

  const { data: created, error: insErr } = await db.from('bookings').insert(rows).select('id')
  // Insert failed → old series untouched. Surface the error, change nothing else.
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  // 4. New rows are in; now retire the old future ones by exact id (never hits
  // the rows we just created).
  let removedCount = 0
  if (oldIds.length > 0) {
    const { data: removed } = await db
      .from('bookings')
      .delete()
      .in('id', oldIds)
      .select('id')
    removedCount = removed?.length || 0
  }

  return NextResponse.json({
    success: true,
    bookings_removed: removedCount,
    bookings_created: created?.length || 0,
  })
}
