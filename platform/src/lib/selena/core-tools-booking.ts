import { randomInt } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { scoreTeamForBooking } from '@/lib/smart-schedule'
import { notify } from '@/lib/nycmaid/notify'
import { smsAdmins } from '@/lib/admin-contacts'
import { SELF_BOOKING_DISCOUNT_DOLLARS } from '@/lib/nycmaid/self-book-discount'
import { yinezError, NYCMAID_TENANT_ID, type YinezResult } from './core-types'
import { loadChecklist, updateChecklist } from './core-intent'

// ─── Phone/Time Helpers ─────────────────────────────────────────────────────

export function parseTime(time: string): { hours: number; minutes: number } | null {
  const match = time.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])$/i)
  if (!match) return null
  let hours = parseInt(match[1])
  const minutes = parseInt(match[2] || '0')
  const ampm = match[3].toUpperCase()
  if (ampm === 'PM' && hours < 12) hours += 12
  if (ampm === 'AM' && hours === 12) hours = 0
  return { hours, minutes }
}

// ─── Tool Handlers ──────────────────────────────────────────────────────────

export async function handleCreateBooking(input: Record<string, unknown>, conversationId: string, result: YinezResult): Promise<string> {
  let tid: string = NYCMAID_TENANT_ID
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, bedrooms, bathrooms, phone, tenant_id').eq('id', conversationId).single()
    if (!convo) return JSON.stringify({ error: 'Conversation not found' })
    tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    // Auto-link by phone if no client_id on the conversation row.
    if (!convo.client_id && convo.phone) {
      const last10 = String(convo.phone).replace(/\D/g, '').slice(-10)
      if (last10.length === 10) {
        const { data: existingClient } = await supabaseAdmin
          .from('clients')
          .select('id')
          .eq('tenant_id', tid)
          .ilike('phone', `%${last10}%`)
          .limit(1)
          .maybeSingle()
        if (existingClient?.id) {
          convo.client_id = existingClient.id
          await supabaseAdmin.from('sms_conversations').update({ client_id: existingClient.id }).eq('id', conversationId).eq('tenant_id', tid)
        }
      }
    }

    // Brand-new client (no match by phone) — auto-create from booking input so
    // create_booking never silently bails on first-time SMS leads. Yinez has
    // the name from the recap; without this branch she'd fall back to
    // request_callback and the customer thinks they're booked while no record
    // exists in the DB.
    if (!convo.client_id && convo.phone) {
      const inputName = typeof input.client_name === 'string' ? input.client_name.trim() : ''
      if (!inputName) {
        return JSON.stringify({ error: 'No client linked yet — pass client_name (and client_email / client_address if known) for new clients' })
      }
      const digits = String(convo.phone).replace(/\D/g, '')
      const last10 = digits.slice(-10)
      if (last10.length !== 10) {
        return JSON.stringify({ error: 'Cannot create client — invalid phone on conversation' })
      }
      const inputEmail = typeof input.client_email === 'string' ? input.client_email.trim() || null : null
      const inputAddress = typeof input.client_address === 'string' ? input.client_address.trim() || null : null
      const pin = randomInt(100000, 1000000).toString()
      const { data: newClient, error: clientErr } = await supabaseAdmin
        .from('clients')
        .insert({ tenant_id: tid, name: inputName, phone: digits, email: inputEmail, address: inputAddress, status: 'potential', pin })
        .select('id')
        .single()
      if (clientErr || !newClient) {
        return JSON.stringify({ error: `Auto-create client failed: ${clientErr?.message || 'insert returned no row'}` })
      }
      convo.client_id = newClient.id
      await supabaseAdmin
        .from('sms_conversations')
        .update({ client_id: newClient.id, name: inputName })
        .eq('id', conversationId)
        .eq('tenant_id', tid)
      result.clientCreated = true
    }

    if (!convo.client_id) return JSON.stringify({ error: 'No client linked yet' })

    const date = input.date as string, time = input.time as string
    const serviceType = input.service_type as string, hourlyRate = input.hourly_rate as number
    const estimatedHours = (input.estimated_hours as number) || 2
    // 'one_time' was previously used as a truthy sentinel for "not recurring"
    // here, but every OTHER reader of bookings.recurring_type across the
    // platform (email/sms isRecurring checks, formatRecurringLabel,
    // dashboard displays) treats any non-null value as recurring -- a plain
    // one-time SMS booking stored 'one_time' and then got told the recurring
    // cancellation policy (7-day notice) instead of the correct one-time
    // policy in smsBookingConfirmation/smsReminder. null is the real
    // "not recurring" convention every other writer in the codebase uses;
    // this module's own reads already tolerate both `null` and the legacy
    // 'one_time' string (`=== 'one_time' || !recurring_type`), so this is
    // backward-compatible with rows written before this fix.
    // Also normalize an explicit 'one_time' input, not just a missing one:
    // an owner-side caller (create_manual_booking, the only reachable path to
    // this handler now that client-facing create_booking is retired) may
    // still pass the literal string, so `|| null` alone (falsy-only) isn't
    // enough. Also normalizes bare 'monthly' -- RecurringType (lib/recurring.ts)
    // has no bare 'monthly', only monthly_date/monthly_weekday (the same
    // normalization client/book, portal/bookings, and the CSV import routes
    // already apply to their own bare-'monthly' form inputs) -- so it's
    // normalized here too, keeping formatRecurringLabel's customer-facing
    // "Schedule: Monthly" instead of the unformatted raw-value fallback
    // "Schedule: monthly".
    const rawRecurringType = input.recurring_type === 'one_time' ? null : (input.recurring_type as string) || null
    const recurringType = rawRecurringType === 'monthly' ? 'monthly_date' : rawRecurringType

    const parsed = parseTime(time)
    if (!parsed) return JSON.stringify({ error: 'Invalid time format' })

    const startTimeStr = `${date}T${parsed.hours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}:00`
    const startMinTotal = parsed.hours * 60 + parsed.minutes
    const endMinTotal = startMinTotal + Math.round(estimatedHours * 60)
    const endHoursInt = Math.min(23, Math.floor(endMinTotal / 60))
    const endMinutesInt = endMinTotal % 60
    const endTimeStr = `${date}T${String(endHoursInt).padStart(2, '0')}:${String(endMinutesInt).padStart(2, '0')}:00`

    const { data: existing } = await supabaseAdmin.from('bookings').select('id')
      .eq('tenant_id', tid)
      .eq('client_id', convo.client_id).eq('start_time', startTimeStr)
      .in('status', ['pending', 'scheduled', 'in_progress']).limit(1)
    if (existing && existing.length > 0) {
      result.bookingCreated = true
      return JSON.stringify({ success: true, bookingId: existing[0].id, message: 'Booking already exists' })
    }

    const checklist = await loadChecklist(conversationId)
    let suggestedCleanerId: string | null = null
    let suggestedReason = ''
    try {
      const scores = await scoreTeamForBooking({
        tenantId: tid,
        date, startTime: `${parsed.hours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}`,
        durationHours: estimatedHours, clientAddress: checklist.address || '',
        clientId: convo.client_id, hourlyRate,
      })
      const top = scores.find(s => s.available && s.score > 0)
      if (top) { suggestedCleanerId = top.id; suggestedReason = top.reason }
    } catch {}

    // Self-booking discount (SELF_BOOKING_DISCOUNT_DOLLARS) applies to Yinez chat
    // bookings too (self-service channel), but applies at BILLING (not at quote).
    // booking.price stays at the un-discounted estimate;
    // /api/team-portal/30min-alert subtracts it from clientOwes when the
    // booking's notes include the self-booking promo flag.
    const basePriceCents = hourlyRate * estimatedHours * 100
    const finalPriceCents = basePriceCents

    const { data: booking, error } = await supabaseAdmin.from('bookings').insert({
      tenant_id: tid,
      client_id: convo.client_id,
      start_time: startTimeStr, end_time: endTimeStr,
      status: 'pending', service_type: serviceType,
      hourly_rate: hourlyRate, price: finalPriceCents,
      recurring_type: recurringType, suggested_team_member_id: suggestedCleanerId,
      notes: `SMS booking | ${convo.bedrooms || 0}BR/${convo.bathrooms || 0}BA${suggestedReason ? ` | Suggested: ${suggestedReason}` : ''} | [Promo: $${SELF_BOOKING_DISCOUNT_DOLLARS} self-booking discount applies at billing]`,
      source: checklist.channel === 'voice' ? 'yinez_voice' : 'yinez_sms',
    }).select('id').single()

    if (error) throw error

    await supabaseAdmin.from('sms_conversations').update({
      booking_id: booking.id, completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), outcome: 'booked',
      summary: `Booked ${serviceType} ${date} ${time} $${hourlyRate}/hr`,
    }).eq('id', conversationId).eq('tenant_id', tid)

    await updateChecklist(conversationId, { status: 'confirmed' })
    result.bookingCreated = true

    await notify({ type: 'new_booking', title: 'New Pending Booking', message: `${checklist.name} booked ${serviceType} on ${date} at ${time}.${suggestedReason ? ` Suggested: ${suggestedReason}` : ' Manual assignment needed.'}`, booking_id: booking.id }).catch(() => {})

    return JSON.stringify({ success: true, bookingId: booking.id, suggested_cleaner: suggestedReason || 'none' })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : JSON.stringify(err)
    await yinezError('create_booking', err, conversationId)
    result.debug = `create_booking failed: ${errMsg}`
    await smsAdmins(tid, `YINEZ BOOKING FAILED — ${errMsg}. Convo ${conversationId}.`).catch(() => {})
    return JSON.stringify({ error: 'booking_failed', success: false, message: errMsg })
  }
}

export async function handleGetQuote(input: Record<string, unknown>): Promise<string> {
  const serviceType = (input.service_type as string) || 'regular'
  const bedrooms = (input.bedrooms as number) ?? 1
  const bathrooms = (input.bathrooms as number) ?? 1

  // Single-number quote — matches the duration we'd actually book. No ranges to clients.
  const regularHrs: Record<string, number> = {
    '0-1': 2.5, '1-1': 2.5, '2-1': 3, '2-2': 3.5, '3-2': 4, '3-3': 5,
  }
  const key = `${bedrooms}-${bathrooms}`
  let hours = regularHrs[key] ?? 3
  if (serviceType === 'deep' || serviceType === 'move_in_out') {
    hours = hours + 1.5
  }

  return JSON.stringify({
    service_type: serviceType, bedrooms, bathrooms,
    estimated_hours: hours,
    rates: { client_supplies: '$59/hr', full_service: '$69/hr', emergency: '$89/hr', recurring_full_service: '$69/hr → 20% off weekly, 10% off biweekly/monthly (after first visit)', recurring_client_supplies: '$59/hr → 10% off weekly, 5% off biweekly/monthly (after first visit)' },
    message: `${bedrooms}BR/${bathrooms}BA ${serviceType} typically runs ${hours} hours.`,
  })
}

