import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateToken } from '@/lib/tokens'
import { sendClientEmail, sendClientSMS } from '@/lib/nycmaid/client-contacts'
import { confirmationEmailFor } from '@/lib/messaging/client-email'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { isCommEnabled } from '@/lib/comms-prefs'

// Client-initiated recurring booking. Creates a recurring_schedules row + the
// initial 6 weeks of bookings. The cron `/api/cron/generate-recurring` extends
// it from there.
//
// Recurring discount: weekly 20%, biweekly/monthly 10%. Only available to
// repeat clients (must have ≥1 completed booking).
export async function POST(request: Request) {
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

  // Resolve tenant from client
  const { data: clientRow } = await supabaseAdmin
    .from('clients')
    .select('tenant_id')
    .eq('id', client_id)
    .single()
  if (!clientRow) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  const tenantId = clientRow.tenant_id

  // Repeat-client gate
  const { count: priorCount } = await supabaseAdmin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
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
    await supabaseAdmin
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

  const { data: schedule, error: scheduleErr } = await supabaseAdmin
    .from('recurring_schedules')
    .insert({
      tenant_id: tenantId,
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
      tenant_id: tenantId,
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

  const { data: bookings, error: bookErr } = await supabaseAdmin
    .from('bookings')
    .insert(rows)
    .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')

  if (bookErr) return NextResponse.json({ error: bookErr.message, schedule }, { status: 500 })

  // booking_team_members rows (lead + extras)
  if (bookings && bookings.length > 0 && (cleaner_id || extras.length > 0)) {
    const teamRows: { tenant_id: string; booking_id: string; team_member_id: string; is_lead: boolean; position: number }[] = []
    for (const b of bookings) {
      if (cleaner_id) teamRows.push({ tenant_id: tenantId, booking_id: b.id, team_member_id: cleaner_id, is_lead: true, position: 1 })
      extras.forEach((cid: string, i: number) => {
        teamRows.push({ tenant_id: tenantId, booking_id: b.id, team_member_id: cid, is_lead: false, position: i + 2 })
      })
    }
    if (teamRows.length > 0) {
      const { error: teamErr } = await supabaseAdmin
        .from('booking_team_members')  // tenant-scope-ok: row-scoped by unique join keys (booking_id, team_member_id)
        .upsert(teamRows, { onConflict: 'booking_id,team_member_id' })
      if (teamErr) console.error('client recurring booking_team_members insert failed:', teamErr.message)
    }
  }

  // Confirm the first booking only
  const first = bookings?.[0]
  if (first && first.status !== 'pending') {
    try {
      if (await isCommEnabled(tenantId, 'booking_confirmed', 'email')) {
        const email = await confirmationEmailFor(tenantId, first)
        await sendClientEmail(client_id, email.subject, email.html)
      }
      if (await isCommEnabled(tenantId, 'booking_confirmed', 'sms')) {
        sendClientSMS(client_id, (await clientSmsTemplatesFor(tenantId)).bookingConfirmation(first), {
          smsType: 'confirmation',
          bookingId: first.id,
        }).catch((err: unknown) => console.error('Recurring confirmation SMS error:', err))
      }
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
