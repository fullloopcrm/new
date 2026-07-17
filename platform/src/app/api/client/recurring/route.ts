import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { generateToken } from '@/lib/tokens'
import { sendClientEmail, sendClientSMS } from '@/lib/nycmaid/client-contacts'
import { confirmationEmailFor } from '@/lib/messaging/client-email'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { protectClientAPI } from '@/lib/client-auth'

// Client-initiated recurring booking. Creates a recurring_schedules row + the
// initial 6 weeks of bookings. The cron `/api/cron/generate-recurring` extends
// it from there.
//
// Recurring discount: weekly 20%, biweekly/monthly 10%. Only available to
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
  } = body
  const maxHoursClean = typeof max_hours === 'number' && max_hours > 0 ? max_hours : null
  const extras: string[] = Array.isArray(extra_cleaner_ids)
    ? extra_cleaner_ids.filter((x: unknown): x is string => typeof x === 'string' && x.length > 0 && x !== cleaner_id)
    : []
  const finalTeamSize = Math.max(1, Math.min(8, team_size || (1 + extras.length)))

  if (!client_id || !frequency || !start_date || !time || !hours) {
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

  // Any caller-supplied team member ids (preferred lead + extras) must belong to
  // THIS tenant — otherwise a client could bind another tenant's cleaner to their
  // schedule/bookings. Validate up front and reject unknown/cross-tenant ids.
  const suppliedMemberIds = [...(cleaner_id ? [cleaner_id] : []), ...extras]
  if (suppliedMemberIds.length > 0) {
    const { data: validMembers } = await tenantDb(tenantId)
      .from('team_members')
      .select('id')
      .in('id', suppliedMemberIds)
    const validIds = new Set((validMembers || []).map((m) => m.id))
    const unknown = suppliedMemberIds.filter((id) => !validIds.has(id))
    if (unknown.length > 0) {
      return NextResponse.json({ error: 'Invalid cleaner selection' }, { status: 400 })
    }
  }

  // A caller-supplied property_id must belong to THIS client (and, via tenantDb's
  // auto tenant_id filter, this tenant) — otherwise a client could attach another
  // client's (or another tenant's) saved address to their own recurring schedule.
  // bookingAddress()/applyPropertyToBookingClient() (lib/client-properties.ts)
  // treat client_properties as the authoritative address for dispatch, admin, and
  // team-portal check-in navigation, so an unvalidated property_id both leaks the
  // other property's address and can send a crew to the wrong location.
  if (property_id) {
    const { data: validProperty } = await tenantDb(tenantId)
      .from('client_properties')
      .select('id')
      .eq('id', property_id)
      .eq('client_id', client_id)
      .maybeSingle()
    if (!validProperty) {
      return NextResponse.json({ error: 'Invalid property selection' }, { status: 400 })
    }
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

  // Pricing: weekly 20%, biweekly/monthly 10%
  const baseRate = supplies === 'client' ? 59 : 79
  const discountPercent = frequency === 'weekly' ? 20 : 10
  const basePriceCents = hours * baseRate * finalTeamSize * 100
  const price = Math.floor(basePriceCents * (1 - discountPercent / 100) / 500) * 500

  if (cleaner_id) {
    await tenantDb(tenantId)
      .from('clients')
      .update({ preferred_team_member_id: cleaner_id })
      .eq('id', client_id)
  }

  // Generate next 6 weeks of dates
  const intervalDays = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 28
  const dates: string[] = []
  const startDt = new Date(start_date + 'T12:00:00')
  const horizon = new Date(startDt)
  horizon.setDate(horizon.getDate() + 42)
  for (let d = new Date(startDt); d <= horizon; d.setDate(d.getDate() + intervalDays)) {
    dates.push(d.toISOString().split('T')[0])
  }
  if (dates.length === 0) {
    return NextResponse.json({ error: 'No dates generated' }, { status: 400 })
  }

  const dayOfWeek = startDt.getDay()
  const recurringType = frequency
  const lastInitialDate = dates[dates.length - 1]

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
    })
    .select()
    .single()

  if (scheduleErr) return NextResponse.json({ error: scheduleErr.message }, { status: 500 })

  // Insert bookings
  const [hh, mm] = time.split(':').map(Number)
  const rows = dates.map((date: string) => {
    const startISO = `${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`
    const endTotalMin = hh * 60 + mm + hours * 60
    const endH = String(Math.floor(endTotalMin / 60) % 24).padStart(2, '0')
    const endM = String(endTotalMin % 60).padStart(2, '0')
    const endISO = `${date}T${endH}:${endM}:00`
    const token = generateToken()
    const tokenExpires = new Date(startISO)
    tokenExpires.setHours(tokenExpires.getHours() + 24)
    return {
      client_id,
      property_id: property_id || null,
      team_member_id: cleaner_id || null,
      start_time: startISO,
      end_time: endISO,
      service_type: service_type || 'Standard Cleaning',
      price,
      hourly_rate: baseRate,
      notes: notes || null,
      recurring_type: recurringType,
      team_member_token: token,
      token_expires_at: tokenExpires.toISOString(),
      status: cleaner_id ? 'scheduled' : 'pending',
      schedule_id: schedule.id,
      team_size: finalTeamSize,
    }
  })

  const { data: bookings, error: bookErr } = await tenantDb(tenantId)
    .from('bookings')
    .insert(rows)
    .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')

  if (bookErr) {
    // Roll back the schedule so a retry doesn't leave this orphaned 'active'
    // row (zero bookings) behind -- same failure mode already fixed on
    // admin/recurring-schedules, sale-to-recurring.ts, and the plain
    // schedules route (5b173982 / this pass).
    await tenantDb(tenantId).from('recurring_schedules').delete().eq('id', schedule.id)
    return NextResponse.json({ error: bookErr.message }, { status: 500 })
  }

  // booking_team_members rows (lead + extras)
  if (bookings && bookings.length > 0 && (cleaner_id || extras.length > 0)) {
    const teamRows: { booking_id: string; team_member_id: string; is_lead: boolean; position: number }[] = []
    for (const b of bookings) {
      if (cleaner_id) teamRows.push({ booking_id: b.id, team_member_id: cleaner_id, is_lead: true, position: 1 })
      extras.forEach((cid: string, i: number) => {
        teamRows.push({ booking_id: b.id, team_member_id: cid, is_lead: false, position: i + 2 })
      })
    }
    if (teamRows.length > 0) {
      const { error: teamErr } = await tenantDb(tenantId)
        .from('booking_team_members')
        .upsert(teamRows, { onConflict: 'booking_id,team_member_id' })
      if (teamErr) {
        // booking_team_members is the ONLY record of non-lead extras --
        // bookings.team_member_id carries just the lead. A swallowed failure
        // here (console.error alone, previously) silently: drops extras from
        // closeout-summary's payout breakdown (falls back to lead-only), locks
        // extras out of this job in team-portal (15min-alert's visibility/authz
        // check reads booking_team_members), and leaves them un-flagged as busy
        // for future scheduling (smart-schedule's conflict check reads it too)
        // -- a real double-booking risk, not just cosmetic. Response still said
        // success with bookings_created > 0. Surface it the same way comms_fail
        // does (lib/nycmaid/sms.ts) so ops actually sees it, instead of only a
        // console line no one is watching.
        console.error('client recurring booking_team_members insert failed:', teamErr.message)
        await tenantDb(tenantId).from('notifications').insert({
          type: 'team_sync_fail',
          title: 'Recurring booking team sync failed',
          message: `schedule ${schedule.id}: booking_team_members write failed for ${bookings.length} booking(s), ${extras.length} extra(s) may be missing from payout/team-portal visibility/scheduling conflicts. error=${teamErr.message}`,
        })
      }
    }
  }

  // Confirm the first booking only
  const first = bookings?.[0]
  if (first && first.status !== 'pending') {
    try {
      const email = await confirmationEmailFor(tenantId, first)
      await sendClientEmail(client_id, email.subject, email.html)
      sendClientSMS(client_id, (await clientSmsTemplatesFor(tenantId)).bookingConfirmation(first), {
        smsType: 'confirmation',
        bookingId: first.id,
      }).catch((err: unknown) => console.error('Recurring confirmation SMS error:', err))
    } catch (err) {
      console.error('Recurring confirmation error:', err)
    }
  }

  return NextResponse.json({
    schedule_id: schedule.id,
    bookings_created: bookings?.length || 0,
    discount_applied: discountPercent,
    price_per_visit: price / 100,
  })
}
