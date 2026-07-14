import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
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

  const db = tenantDb(tenantId)

  // Confirm the schedule belongs to this tenant; pull client_id + property_id to
  // preserve them on the regenerated bookings.
  const { data: schedule } = await db
    .from('recurring_schedules')
    .select('id, client_id, property_id, pay_rate, hourly_rate')
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
  if (day_of_week !== undefined) rulePatch.day_of_week = day_of_week
  if (preferred_time !== undefined) rulePatch.preferred_time = preferred_time
  if (duration_hours !== undefined) rulePatch.duration_hours = hours
  if (hourly_rate !== undefined) rulePatch.hourly_rate = hourly_rate
  if (payRate !== null) rulePatch.pay_rate = effPayRate
  if (teamMemberId !== null) rulePatch.team_member_id = teamMemberId
  if (notes !== undefined) rulePatch.notes = notes
  await db.from('recurring_schedules').update(rulePatch).eq('id', id)

  // 2. Capture the OLD future not-yet-serviced bookings (scheduled/pending) from
  // the cutoff forward. Completed/paid/cancelled rows are never touched. We
  // delete these by id AFTER the new insert succeeds, so a failed insert leaves
  // the existing series fully intact (no destructive window).
  const cutoff = from_date || new Date().toISOString()
  const { data: oldRows } = await db
    .from('bookings')
    .select('id')
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
