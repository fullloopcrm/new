import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { generateToken } from '@/lib/tokens'

// Atomic "edit recurring pattern" for a series. Replaces the old client-side
// loop (delete-each future booking, then create-each new one — N+N requests,
// fragile, partial-failure prone) with ONE server call:
//   1. update the schedule rule (pattern/time/member/rate)
//   2. hard-delete this series' FUTURE scheduled/pending bookings from `from_date`
//      (never touches completed/paid/cancelled history — same scope the client
//      loop deleted, just set-based)
//   3. insert the new pattern's bookings (carrying the schedule's property_id)
// Tenant-scoped, admin-only, no client notifications (admin-managed flow).

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

  const teamMemberId = team_member_id ?? cleaner_id ?? null
  const payRate = pay_rate ?? cleaner_pay_rate ?? null
  const hours = duration_hours || 3

  // Confirm the schedule belongs to this tenant; pull client_id + property_id to
  // preserve them on the regenerated bookings.
  const { data: schedule } = await supabaseAdmin
    .from('recurring_schedules')
    .select('id, client_id, property_id, pay_rate, hourly_rate, updated_at')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })

  // Confirm a caller-supplied team member actually belongs to this tenant --
  // otherwise a foreign id gets written onto every regenerated booking and
  // resurfaces via the team_members() join, a cross-tenant PII leak (same
  // class fixed on the base recurring-schedules route in 4c0e3635).
  if (teamMemberId) {
    const { data: memberRow } = await supabaseAdmin
      .from('team_members').select('id').eq('id', teamMemberId).eq('tenant_id', tenantId).single()
    if (!memberRow) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
  }

  // Fall back to the schedule's stored rates when the caller omits them, so an
  // edit that doesn't resend pay_rate can't zero out cleaner payout.
  const effPayRate = payRate ?? schedule.pay_rate ?? null
  const effHourlyRate = hourly_rate ?? schedule.hourly_rate ?? null

  const lastDate = dates[dates.length - 1]

  // 1. Update the rule -- atomically claimed (see comment below).
  const rulePatch: Record<string, unknown> = { updated_at: new Date().toISOString(), next_generate_after: lastDate }
  if (recurring_type !== undefined) rulePatch.recurring_type = recurring_type
  if (day_of_week !== undefined) rulePatch.day_of_week = day_of_week
  if (preferred_time !== undefined) rulePatch.preferred_time = preferred_time
  if (duration_hours !== undefined) rulePatch.duration_hours = hours
  if (hourly_rate !== undefined) rulePatch.hourly_rate = hourly_rate
  if (payRate !== null) rulePatch.pay_rate = effPayRate
  if (teamMemberId !== null) rulePatch.team_member_id = teamMemberId
  if (notes !== undefined) rulePatch.notes = notes

  // Atomic claim: two concurrent regenerate calls (double-click of Save, or a
  // client retry after a slow response) both read the same `schedule` row
  // above and, without a guard here, would both insert a full duplicate set
  // of new booking rows for the same series in step 3 before either's delete
  // of the old rows runs in step 4 -- net result is duplicate scheduled
  // bookings left on the calendar/team portal for the same series. Use the
  // row's own updated_at as an optimistic-concurrency version: only the
  // caller whose earlier read is still current gets to write; the loser's
  // compare-and-swap UPDATE matches zero rows and gets a clean 409 instead of
  // racing the insert below.
  let claimQuery = supabaseAdmin
    .from('recurring_schedules')
    .update(rulePatch)
    .eq('id', id)
    .eq('tenant_id', tenantId)
  claimQuery = schedule.updated_at
    ? claimQuery.eq('updated_at', schedule.updated_at)
    : claimQuery.is('updated_at', null)
  const { data: claimed } = await claimQuery.select('id')
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: 'This schedule was just updated elsewhere. Reload and try again.' }, { status: 409 })
  }

  // 2. Capture the OLD future not-yet-serviced bookings (scheduled/pending) from
  // the cutoff forward. Completed/paid/cancelled rows are never touched. We
  // delete these by id AFTER the new insert succeeds, so a failed insert leaves
  // the existing series fully intact (no destructive window).
  const cutoff = from_date || new Date().toISOString()
  const { data: oldRows } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('schedule_id', id)
    .in('status', ['scheduled', 'pending'])
    .gte('start_time', cutoff)
  const oldIds = (oldRows || []).map((r: { id: string }) => r.id)

  // 3. Insert the new pattern.
  const { h, m } = parseTime(preferred_time)
  const rows = dates.map((date: string) => {
    const startISO = `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    const endTotalMin = h * 60 + m + hours * 60
    const endISO = `${date}T${String(Math.floor(endTotalMin / 60) % 24).padStart(2, '0')}:${String(endTotalMin % 60).padStart(2, '0')}:00`
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
      price: price || 0,
      hourly_rate: effHourlyRate,
      pay_rate: effPayRate,
      notes: notes || null,
      recurring_type,
      team_member_token: token,
      token_expires_at: tokenExpires.toISOString(),
      status: bookingStatus || 'scheduled',
      schedule_id: id,
    }
  })

  const { data: created, error: insErr } = await supabaseAdmin.from('bookings').insert(rows).select('id')
  // Insert failed → old series untouched. Surface the error, change nothing else.
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  // 4. New rows are in; now retire the old future ones by exact id (never hits
  // the rows we just created). A single multi-row DELETE is atomic in
  // Postgres: if ANY old row has since picked up a payment (payments.booking_id
  // has no ON DELETE action — same RESTRICT case as booking-delete-guard.ts —
  // e.g. a deposit collected via /api/payments/link, which never checks
  // booking status), the whole DELETE is rejected and every old row survives.
  // The new rows from step 3 are already committed, so a swallowed error here
  // used to leave duplicate old+new bookings on the calendar while still
  // reporting `success: true` — exactly the double-booking outcome this
  // route's own atomic-claim step was written to prevent. Surface it instead.
  let removedCount = 0
  if (oldIds.length > 0) {
    const { data: removed, error: delErr } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('tenant_id', tenantId)
      .in('id', oldIds)
      .select('id')
    if (delErr) {
      return NextResponse.json({
        error: 'New bookings were created, but one or more of the old series bookings could not be removed (likely because a payment was already collected against it) — the calendar now has both old and new bookings for this series. Cancel the affected old booking(s) manually.',
        bookings_created: created?.length || 0,
      }, { status: 409 })
    }
    removedCount = removed?.length || 0
  }

  return NextResponse.json({
    success: true,
    bookings_removed: removedCount,
    bookings_created: created?.length || 0,
  })
}
