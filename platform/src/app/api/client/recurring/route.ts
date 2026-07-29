import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { supabaseAdmin } from '@/lib/supabase'
import { generateToken } from '@/lib/tokens'
import { sendClientEmail, sendClientSMS } from '@/lib/client-contacts'
import { buildBookingConfirmationEmail } from '@/lib/notify'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { protectClientAPI } from '@/lib/client-auth'
import { isCommEnabled } from '@/lib/comms-prefs'
import { suggestTeamMemberForRecurring } from '@/lib/recurring-team-suggest'
import { generateRecurringDates, type RecurringType } from '@/lib/recurring'
import { recurringDiscountPct } from '@/lib/nycmaid/recurring-discount'
import { scoreTeamForBooking, pickBestTeam } from '@/lib/smart-schedule'
import { getBookingAddress } from '@/lib/client-properties'
import { getSettings } from '@/lib/settings'

// Client-initiated recurring booking. Creates a recurring_schedules row + the
// initial 6 weeks of bookings. The cron `/api/cron/generate-recurring` extends
// it from there.
//
// Auth: client session cookie (protectClientAPI), scoped to the tenant
// resolved from the request's domain (getTenantFromHeaders) — same pattern as
// the other /api/client/* routes. client_id in the body must match the
// session's own client_id. Without this, an unauthenticated caller could spin
// up a real recurring booking series (with real pricing) against any client
// and overwrite their preferred_team_member_id
// (deploy-prep/none-write-routes-triage.md row 3).
//
// Recurring discount: weekly 20%, biweekly 10%, monthly 5%. Only available to
// repeat clients (must have ≥1 completed booking).
export async function POST(request: Request) {
  // Tenant from the request context (subdomain/host), NOT derived from the
  // body's client_id — deriving tenant from an attacker-supplied id is the IDOR.
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const body = await request.json()
  const {
    client_id,
    property_id,
    frequency,
    start_date,
    time,
    hours,
    service_type,
    supplies,
    cleaner_id, // optional preferred team_member (lead)
    extra_cleaner_ids,
    team_size,
    max_hours,
    notes,
    days_of_week, // optional multi-day cadence (e.g. [1,3,5] for Mon/Wed/Fri)
  } = body

  // `/api/client(.*)` is exempted from the platform's Clerk/session middleware
  // (see middleware.ts) — each handler must verify the caller IS the client.
  // This route had no check at all: any caller who knew a client_id could spin
  // up a real 6-week recurring booking series (discounted pricing, real SMS/
  // email sent to that client) and reassign their preferred cleaner, with zero
  // proof of session.
  if (!client_id) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const maxHoursClean = typeof max_hours === 'number' && max_hours > 0 ? max_hours : null
  const extras: string[] = Array.isArray(extra_cleaner_ids)
    ? extra_cleaner_ids.filter((x: unknown): x is string => typeof x === 'string' && x.length > 0 && x !== cleaner_id)
    : []
  const finalTeamSize = Math.max(1, Math.min(8, team_size || (1 + extras.length)))

  if (!frequency || !start_date || !time || !hours) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
    return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 })
  }

  // Ownership gate: the caller's signed client_session must match this tenant
  // AND this client_id. A forged/other client_id => 403, so a known id cannot
  // create recurring bookings (and charge) for another client or tenant.
  const auth = await protectClientAPI(tenant.id, client_id)
  if (auth instanceof NextResponse) return auth
  const tenantId = tenant.id

  // Validate a caller-supplied property_id belongs to THIS client (client/book
  // never trusts a caller-supplied property_id at all — it always resolves one
  // server-side off the client's own address; this route deviates from that
  // pattern by accepting one directly, so it must be checked here instead).
  if (property_id) {
    const { data: prop } = await supabaseAdmin
      .from('client_properties')
      .select('id')
      .eq('id', property_id)
      .eq('client_id', client_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!prop) return NextResponse.json({ error: 'Invalid property selection' }, { status: 400 })
  }

  // Repeat-client gate
  const { count: priorCount } = await tenantDb(tenantId)
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', client_id)
    .eq('status', 'completed')
  if ((priorCount || 0) < 1) {
    return NextResponse.json({
      error: 'Recurring is available after your first completed cleaning. Book a one-time first.',
    }, { status: 403 })
  }

  // A client picking their crew must stay inside their own tenant's active
  // roster — same gate /api/client/preferred-cleaner and reschedule enforce.
  // Without this, cleaner_id/extra_cleaner_ids were written straight from
  // client input with no ownership check, letting a client point their
  // recurring schedule + every generated booking's team_member_id FK at any
  // team_members row (including another tenant's).
  if (cleaner_id) {
    const { data: leadMember } = await supabaseAdmin
      .from('team_members')
      .select('id, active')
      .eq('id', cleaner_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!leadMember || leadMember.active === false) {
      return NextResponse.json({ error: 'Cleaner not available' }, { status: 400 })
    }
  }
  if (extras.length > 0) {
    const { data: extraMembers } = await supabaseAdmin
      .from('team_members')
      .select('id, active')
      .in('id', extras)
      .eq('tenant_id', tenantId)
    const validIds = new Set((extraMembers || []).filter((m) => m.active !== false).map((m) => m.id))
    if (extras.some((id) => !validIds.has(id))) {
      return NextResponse.json({ error: 'Cleaner not available' }, { status: 400 })
    }
  }

  // Pricing: weekly 20%, biweekly 10%, monthly 5% -- via the shared
  // recurringDiscountPct() single source of truth (also used by the admin
  // recurring-schedules creation path), not a duplicated inline ternary that
  // could drift from it.
  const baseRate = supplies === 'client' ? 59 : 79
  const discountPercent = Math.round(recurringDiscountPct(frequency) * 100)
  const basePriceCents = hours * baseRate * finalTeamSize * 100
  const price = Math.floor(basePriceCents * (1 - discountPercent / 100) / 500) * 500

  if (cleaner_id) {
    await tenantDb(tenantId)
      .from('clients')
      .update({ preferred_team_member_id: cleaner_id })
      .eq('id', client_id)
      .eq('tenant_id', tenantId)
  }

  const startDt = new Date(start_date + 'T12:00:00')
  const dayOfWeek = startDt.getDay()
  // recurring_schedules.recurring_type must be a real RecurringType
  // (lib/recurring.ts) -- 'weekly' and 'biweekly' pass through as-is, but
  // 'monthly' is not one of the valid values (they're 'monthly_date' /
  // 'monthly_weekday'). Storing the bare 'monthly' string here silently
  // broke every self-booked monthly client's series once the cron tried to
  // refill it: generateRecurringDates()'s switch has no case for 'monthly',
  // so it matched nothing and returned zero dates -- the cron generated
  // NOTHING after the initial 6-week batch this route creates directly,
  // forever, with no error anywhere.
  const recurringType: RecurringType = frequency === 'monthly' ? 'monthly_date' : (frequency as RecurringType)

  // Single source of truth for date generation (lib/recurring.ts), same
  // function every other creation/refill path uses -- this route used to
  // hand-roll its own flat interval-day loop (7/14/28 days), which used a
  // flat 28-day "month" for monthly clients instead of the real calendar
  // month (drifting the visit date earlier every cycle) and had no holiday
  // filtering. weeksToGenerate is an OCCURRENCE count, not a time window, so
  // ask for a generous batch and filter down to the original "initial 6
  // weeks" window -- otherwise a biweekly/monthly client would get months of
  // bookings created upfront instead of the intended ~6-week starter batch.
  const sixWeeksOut = new Date(startDt)
  sixWeeksOut.setDate(sixWeeksOut.getDate() + 42)
  // Multi-day cadence (e.g. Mon/Wed/Fri) — generateRecurringDates already
  // supports a daysOfWeek array (see lib/recurring.ts), but this route never
  // wired it through at creation time; a client could only get it applied via
  // a follow-up PUT to /api/client/recurring/[id]. Trivial to pass through
  // here since we're already at this call site for the availability fix.
  const daysOfWeek: number[] | null = Array.isArray(days_of_week) && days_of_week.length > 0
    ? days_of_week.filter((d: unknown): d is number => typeof d === 'number' && d >= 0 && d <= 6)
    : null
  const dates = generateRecurringDates({
    recurringType,
    startDate: startDt,
    dayOfWeek,
    daysOfWeek,
    weeksToGenerate: 6,
  })
    .filter((d) => d <= sixWeeksOut)
    .map((d) => d.toISOString().slice(0, 10))
  if (dates.length === 0) {
    return NextResponse.json({ error: 'No dates generated' }, { status: 400 })
  }

  const lastInitialDate = dates[dates.length - 1]

  // No cleaner picked → suggest one via the same smart-matcher one-time
  // bookings use, rather than leaving the whole series unassigned with no
  // recommendation.
  let suggestedTeamMemberId: string | null = null
  if (!cleaner_id) {
    suggestedTeamMemberId = await suggestTeamMemberForRecurring({
      tenantId,
      clientId: client_id,
      propertyId: property_id || null,
      date: start_date,
      startTime: time,
      durationHours: hours,
      hourlyRate: baseRate,
    })
  }

  const { data: schedule, error: scheduleErr } = await tenantDb(tenantId)
    .from('recurring_schedules')
    .insert({
      client_id,
      property_id: property_id || null,
      team_member_id: cleaner_id || null,
      recurring_type: recurringType,
      day_of_week: dayOfWeek,
      preferred_time: time,
      duration_hours: hours,
      hourly_rate: baseRate,
      notes: notes || null,
      status: 'active',
      next_generate_after: lastInitialDate,
      discount_percent: discountPercent,
      ...(daysOfWeek ? { days_of_week: daysOfWeek } : {}),
    })
    .select()
    .single()

  if (scheduleErr) return NextResponse.json({ error: scheduleErr.message }, { status: 500 })

  // Per-date availability check -- a requested cleaner_id used to get written
  // onto every generated date with zero verification, which could double-book
  // them or assign them to a day they're not actually available for. Mirrors
  // /api/schedules and the cron refill job exactly: score each date
  // individually, keep the requested lead if they're actually free that date,
  // otherwise fall back to the best-scoring available alternate
  // (smart_recurring_assign flag, same semantics as the cron refill) or leave
  // that one occurrence unassigned+flagged for manual review. Extras
  // (extra_cleaner_ids) aren't scored per-date here -- neither sibling route
  // supports multi-tech per-date availability today either.
  const { smart_recurring_assign: smartAssign } = await getSettings(tenantId)
  let jobAddr: { address: string | null; latitude: number | null; longitude: number | null } | null = null
  if (cleaner_id) {
    jobAddr = await getBookingAddress({ propertyId: property_id || null, clientId: client_id })
  }

  // Insert bookings
  const [hh, mm] = time.split(':').map(Number)
  const rows: Record<string, unknown>[] = []
  for (const date of dates) {
    const startISO = `${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`
    const endTotalMin = hh * 60 + mm + hours * 60
    const endH = String(Math.floor(endTotalMin / 60) % 24).padStart(2, '0')
    const endM = String(endTotalMin % 60).padStart(2, '0')
    const endISO = `${date}T${endH}:${endM}:00`
    const token = generateToken()
    const tokenExpires = new Date(startISO)
    tokenExpires.setHours(tokenExpires.getHours() + 24)

    let assignedId: string | null = cleaner_id || null
    let unassignedNote: string | null = null
    if (cleaner_id) {
      const scores = await scoreTeamForBooking({
        tenantId,
        date,
        startTime: time,
        durationHours: hours,
        clientAddress: jobAddr?.address || '',
        clientId: client_id,
        hourlyRate: baseRate,
        jobCoords: jobAddr?.latitude != null && jobAddr?.longitude != null
          ? { lat: Number(jobAddr.latitude), lng: Number(jobAddr.longitude) }
          : undefined,
      })
      const requestedStillFree = scores.find((s) => s.id === cleaner_id && s.available)
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
      price,
      hourly_rate: baseRate,
      notes: unassignedNote ? `${notes ? notes + ' — ' : ''}${unassignedNote}` : (notes || null),
      recurring_type: recurringType,
      team_member_token: token,
      token_expires_at: tokenExpires.toISOString(),
      status: cleaner_id ? 'scheduled' : 'pending',
      schedule_id: schedule.id,
      team_size: finalTeamSize,
      suggested_team_member_id: assignedId ? null : suggestedTeamMemberId,
      source: 'client_portal',
    })
  }

  // The fn_block_booking_overlap trigger fires BEFORE INSERT and aborts the
  // whole batch statement on any single conflicting row. The per-occurrence
  // check above should already keep conflicting rows out, but fall back to
  // per-row inserts on any batch error so a conflict slipping through (race
  // condition, stale score) still lands every non-conflicting occurrence
  // instead of silently creating zero bookings -- mirrors /api/schedules and
  // cron/generate-recurring's existing fallback.
  type BookingRow = Record<string, unknown> & {
    id: string
    status?: string | null
    service_type?: string | null
    start_time: string
    team_member_id: string | null
    clients?: { name?: string | null } | null
  }
  let bookings: BookingRow[] = []
  const skippedDates: string[] = []
  const { data: batchBookings, error: batchErr } = await tenantDb(tenantId)
    .from('bookings')
    .insert(rows)
    .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
  if (!batchErr && batchBookings) {
    bookings = batchBookings
  } else {
    for (const row of rows) {
      const { data: rowData, error: rowErr } = await tenantDb(tenantId)
        .from('bookings')
        .insert(row)
        .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
        .single()
      if (rowErr) skippedDates.push(String(row.start_time))
      else if (rowData) bookings.push(rowData)
    }
  }

  // booking_team_members rows (lead + extras). Lead uses each booking's OWN
  // resolved team_member_id (which may differ per date from the originally
  // requested cleaner_id after the per-date reassignment above), not the
  // blanket cleaner_id -- otherwise a date reassigned to an alternate (or
  // left unassigned) would still get the original cleaner wired in here.
  if (bookings.length > 0 && (cleaner_id || extras.length > 0)) {
    const teamRows: { booking_id: string; team_member_id: string; is_lead: boolean; position: number }[] = []
    for (const b of bookings) {
      const leadId = b.team_member_id as string | null
      if (leadId) teamRows.push({ booking_id: b.id as string, team_member_id: leadId, is_lead: true, position: 1 })
      extras.forEach((cid: string, i: number) => {
        teamRows.push({ booking_id: b.id as string, team_member_id: cid, is_lead: false, position: i + 2 })
      })
    }
    if (teamRows.length > 0) {
      const { error: teamErr } = await tenantDb(tenantId)
        .from('booking_team_members')
        .upsert(teamRows, { onConflict: 'booking_id,team_member_id' })
      if (teamErr) console.error('client recurring booking_team_members insert failed:', teamErr.message)
    }
  }

  // Confirm the first booking only
  const first = bookings?.[0]
  if (first && first.status !== 'pending') {
    try {
      if (await isCommEnabled(tenantId, 'booking_confirmed', 'email')) {
        const html = await buildBookingConfirmationEmail(tenantId, first.id, {
          clientName: first.clients?.name || 'there',
          serviceName: first.service_type || 'Appointment',
          dateTime: new Date(first.start_time).toLocaleString('en-US', {
            timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
          }),
        })
        await sendClientEmail(tenant, client_id, `Booking Confirmed`, html)
      }
      if (await isCommEnabled(tenantId, 'booking_confirmed', 'sms')) {
        sendClientSMS(tenant, client_id, (await clientSmsTemplatesFor(tenantId)).bookingConfirmation(first))
          .catch((err: unknown) => console.error('Recurring confirmation SMS error:', err))
      }
    } catch (err) {
      console.error('Recurring confirmation error:', err)
    }
  }

  return NextResponse.json({
    schedule_id: schedule.id,
    bookings_created: bookings?.length || 0,
    skipped_dates: skippedDates,
    discount_applied: discountPercent,
    price_per_visit: price / 100,
  })
}
