/**
 * Turn a sold RECURRING service quote into a live recurring_schedules series
 * (+ the first ~6 weeks of bookings). The `generate-recurring` cron then keeps
 * it rolling. This is the recurring sibling of createJobFromQuote (projects) and
 * the /convert booking path (one-off services).
 *
 * Only fires when quote.recurring_type is set. Idempotent on
 * quotes.converted_schedule_id.
 *
 * Client resolution mirrors createJobFromQuote so a sold recurring service ties
 * to the SAME client the deal/quote carried — no re-keyed contact.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { generateToken } from '@/lib/tokens'

function intervalDays(recurringType: string): number {
  switch (recurringType) {
    case 'weekly': return 7
    case 'biweekly': return 14
    case 'triweekly': return 21
    default: return 28 // monthly_date / monthly_weekday
  }
}

// "HH:MM" / "h:MM AM/PM" -> { h, m }
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

export async function createRecurringSeriesFromQuote(
  tenantId: string,
  quoteId: string,
): Promise<{ schedule_id: string; bookings_created: number; already_converted: boolean }> {
  const { data: quote, error: qErr } = await supabaseAdmin
    .from('quotes')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', quoteId)
    .single()
  if (qErr || !quote) throw new Error('Quote not found')

  if (quote.converted_schedule_id) {
    return { schedule_id: quote.converted_schedule_id as string, bookings_created: 0, already_converted: true }
  }
  if (!quote.recurring_type) throw new Error('Quote is not recurring')
  if (quote.status !== 'accepted') {
    throw new Error(`Can only convert accepted quotes (current: ${quote.status})`)
  }

  // Resolve or create the client (identical to createJobFromQuote).
  let clientId = quote.client_id as string | null
  if (!clientId) {
    const existing = quote.contact_email
      ? await supabaseAdmin
          .from('clients')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('email', quote.contact_email)
          .maybeSingle()
      : { data: null }
    if (existing.data?.id) {
      clientId = existing.data.id as string
    } else {
      const { data: newClient, error: cErr } = await supabaseAdmin
        .from('clients')
        .insert({
          tenant_id: tenantId,
          name: quote.contact_name || quote.title || 'Quote Client',
          email: quote.contact_email || null,
          phone: quote.contact_phone || null,
          address: quote.service_address || null,
          source: 'quote',
          status: 'active',
        })
        .select('id')
        .single()
      if (cErr) throw cErr
      clientId = newClient.id as string
    }
  }

  const recurringType = quote.recurring_type as string
  const startDate = (quote.recurring_start_date as string | null) || new Date().toISOString().split('T')[0]
  const preferredTime = (quote.recurring_preferred_time as string | null) || '09:00'
  const hours = Number(quote.recurring_duration_hours) || 3
  const pricePerVisit = ((quote.total_cents as number) || 0) / 100

  // Initial dates: from start_date across a 6-week horizon.
  const step = intervalDays(recurringType)
  const startDt = new Date(startDate + 'T12:00:00')
  const horizon = new Date(startDt)
  horizon.setDate(horizon.getDate() + 42)
  const dates: string[] = []
  for (let d = new Date(startDt); d <= horizon; d.setDate(d.getDate() + step)) {
    dates.push(d.toISOString().split('T')[0])
  }
  const nextGenerateAfter = dates.length ? dates[dates.length - 1] : startDate

  const { data: schedule, error: sErr } = await supabaseAdmin
    .from('recurring_schedules')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      recurring_type: recurringType,
      day_of_week: startDt.getDay(),
      preferred_time: preferredTime,
      duration_hours: hours,
      notes: quote.notes || null,
      status: 'active',
      next_generate_after: nextGenerateAfter,
    })
    .select('id')
    .single()
  if (sErr) throw sErr
  const scheduleId = schedule.id as string

  // Initial bookings (mirrors /api/admin/recurring-schedules generation).
  const { h, m } = parseTime(preferredTime)
  const rows = dates.map((date) => {
    const startISO = `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    const endTotal = h * 60 + m + hours * 60
    const endISO = `${date}T${String(Math.floor(endTotal / 60) % 24).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}:00`
    const token = generateToken()
    const tokenExpires = new Date(startISO)
    tokenExpires.setHours(tokenExpires.getHours() + 24)
    return {
      tenant_id: tenantId,
      client_id: clientId,
      start_time: startISO,
      end_time: endISO,
      service_type: quote.title || 'Recurring Service',
      price: pricePerVisit,
      recurring_type: recurringType,
      team_member_token: token,
      token_expires_at: tokenExpires.toISOString(),
      status: 'scheduled',
      schedule_id: scheduleId,
    }
  })
  let bookingsCreated = 0
  if (rows.length) {
    const { data: bk, error: bErr } = await supabaseAdmin.from('bookings').insert(rows).select('id')
    if (bErr) throw bErr
    bookingsCreated = bk?.length || 0
  }

  await supabaseAdmin
    .from('quotes')
    .update({ status: 'converted', converted_schedule_id: scheduleId })
    .eq('id', quoteId)
    .eq('tenant_id', tenantId)

  return { schedule_id: scheduleId, bookings_created: bookingsCreated, already_converted: false }
}
