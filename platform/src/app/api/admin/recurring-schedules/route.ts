import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { generateToken } from '@/lib/tokens'
import { recurringDiscountPct } from '@/lib/nycmaid/recurring-discount'
import { suggestTeamMemberForRecurring } from '@/lib/recurring-team-suggest'
import { nowNaiveET } from '@/lib/recurring'
import { scoreTeamForBooking, pickBestTeam } from '@/lib/smart-schedule'
import { getBookingAddress } from '@/lib/client-properties'
import { getSettings } from '@/lib/settings'

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
        // start_time is naive ET — a real-instant boundary here excluded
        // this-morning bookings hours before they'd actually happened.
        .gte('start_time', `${nowNaiveET()}Z`)
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
  // Auto-apply the recurring discount (weekly 20% / biweekly 10% / monthly 5%)
  // unless the admin explicitly passed a value (including an explicit 0 to
  // override off) — matches the policy already enforced in
  // /api/client/recurring, ported here so admin-created schedules get the
  // same auto-discount instead of silently defaulting to none.
  const finalDiscountPercent = discount_percent != null
    ? discount_percent
    : Math.round(recurringDiscountPct(recurring_type) * 100)

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

  // No cleaner picked → suggest one via the same smart-matcher one-time
  // bookings use, rather than leaving the whole series unassigned with no
  // recommendation. Admin can still override per-visit as normal.
  let suggestedTeamMemberId: string | null = null
  if (!teamMemberId && dates.length > 0) {
    const { h: suggestH, m: suggestM } = parseTime(preferred_time)
    suggestedTeamMemberId = await suggestTeamMemberForRecurring({
      tenantId,
      clientId: client_id,
      propertyId: property_id || null,
      date: start_date,
      startTime: `${String(suggestH).padStart(2, '0')}:${String(suggestM).padStart(2, '0')}`,
      durationHours: hours,
      hourlyRate: hourly_rate,
    })
  }

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
      invoice_consolidation: invoice_consolidation === 'monthly' ? 'monthly' : 'per_visit',
      discount_percent: finalDiscountPercent || null,
    })
    .select()
    .single()

  if (scheduleErr) return NextResponse.json({ error: scheduleErr.message }, { status: 500 })

  if (dates.length === 0) {
    return NextResponse.json({ schedule, bookings_created: 0 })
  }

  const { h, m } = parseTime(preferred_time)

  // Per-date availability check -- a requested team_member_id used to get
  // written onto every generated date with zero verification, which could
  // double-book them or assign them to a day they're not actually available
  // for. Mirrors /api/schedules and the cron refill job exactly: score each
  // date individually, keep the requested member if they're actually free
  // that date, otherwise fall back to the best-scoring available alternate
  // (smart_recurring_assign flag, same semantics as the cron refill) or
  // leave that one occurrence unassigned+flagged for manual review.
  const { smart_recurring_assign: smartAssign } = await getSettings(tenantId)
  let jobAddr: { address: string | null; latitude: number | null; longitude: number | null } | null = null
  if (teamMemberId) {
    jobAddr = await getBookingAddress({ propertyId: property_id || null, clientId: client_id })
  }

  const rows: Record<string, unknown>[] = []
  for (const date of dates) {
    const startISO = `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    const endTotalMin = h * 60 + m + hours * 60
    const endISO = `${date}T${String(Math.floor(endTotalMin / 60) % 24).padStart(2, '0')}:${String(endTotalMin % 60).padStart(2, '0')}:00`
    const token = generateToken()
    const tokenExpires = new Date(startISO)
    tokenExpires.setHours(tokenExpires.getHours() + 24)

    let assignedId: string | null = teamMemberId
    let unassignedNote: string | null = null
    if (teamMemberId) {
      const startHHMM = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const scores = await scoreTeamForBooking({
        tenantId,
        date,
        startTime: startHHMM,
        durationHours: hours,
        clientAddress: jobAddr?.address || '',
        clientId: client_id,
        hourlyRate: hourly_rate != null ? Number(hourly_rate) : undefined,
        jobCoords: jobAddr?.latitude != null && jobAddr?.longitude != null
          ? { lat: Number(jobAddr.latitude), lng: Number(jobAddr.longitude) }
          : undefined,
      })
      const requestedStillFree = scores.find((s) => s.id === teamMemberId && s.available)
      if (!requestedStillFree) {
        const alternate = smartAssign ? pickBestTeam(scores, 1).lead : null
        assignedId = alternate?.id ?? null
        unassignedNote = alternate
          ? null
          : `[Auto: requested team member unavailable ${date} — needs reassignment]`
      }
    }

    rows.push({
      client_id,
      property_id: property_id || null,
      team_member_id: assignedId,
      start_time: startISO,
      end_time: endISO,
      service_type: service_type || 'Standard Cleaning',
      price: price || 0,
      hourly_rate: hourly_rate || null,
      pay_rate: payRate,
      notes: unassignedNote ? `${notes ? notes + ' — ' : ''}${unassignedNote}` : (notes || null),
      recurring_type,
      team_member_token: token,
      token_expires_at: tokenExpires.toISOString(),
      status: bookingStatus || 'scheduled',
      schedule_id: schedule.id,
      discount_percent: finalDiscountPercent || null,
      suggested_team_member_id: assignedId ? null : suggestedTeamMemberId,
      source: 'admin',
    })
  }

  // The fn_block_booking_overlap trigger fires BEFORE INSERT and aborts the
  // whole batch statement on any single conflicting row. The per-occurrence
  // check above should already keep conflicting rows out, but fall back to
  // per-row inserts on any batch error so a conflict slipping through (race
  // condition, stale score) still lands every non-conflicting occurrence
  // instead of silently creating zero bookings — mirrors /api/schedules and
  // cron/generate-recurring's existing fallback.
  let bookingsCreated = 0
  const skippedDates: string[] = []
  const { error: batchError } = await db
    .from('bookings')  // tenant-scope-ok: insert rows carry tenant_id (built above)
    .insert(rows)
  if (!batchError) {
    bookingsCreated = rows.length
  } else {
    for (const row of rows) {
      const { error: rowErr } = await db.from('bookings').insert(row)  // tenant-scope-ok: row carries tenant_id (built above)
      if (rowErr) skippedDates.push(String(row.start_time))
      else bookingsCreated++
    }
  }

  // No client/team notifications here by design (admin-only flow).
  return NextResponse.json({ schedule, bookings_created: bookingsCreated, skipped_dates: skippedDates })
}
