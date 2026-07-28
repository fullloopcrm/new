import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/nycmaid/notify'
import { yinezError, NYCMAID_TENANT_ID, type YinezResult } from './core-types'
import { parseTime, handleCreateBooking, handleAddToWaitlist, handleGetQuote } from './core-tools-booking'
import { handleGetAccount, handleUpdateAccount, handleSendPin, handleResendConfirmation, handleCheckPayment, handleConfirmPayment, handleGetInvoice } from './core-tools-account'

async function handleLookupBookings(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID
    const filter = (input.status_filter as string) || 'upcoming'
    const now = new Date().toISOString()
    let query = supabaseAdmin.from('bookings')
      .select('id, start_time, end_time, status, service_type, hourly_rate, price, payment_status, team_members(name), actual_hours, recurring_type')
      .eq('tenant_id', tid).eq('client_id', convo.client_id).order('start_time', { ascending: filter === 'upcoming' }).limit(5)
    if (filter === 'upcoming') query = query.gte('start_time', now).in('status', ['pending', 'scheduled', 'confirmed', 'in_progress', 'checked_in'])
    else if (filter === 'completed') query = query.eq('status', 'completed').order('start_time', { ascending: false })
    const { data: bookings } = await query
    if (!bookings?.length) return JSON.stringify({ bookings: [], message: 'No bookings found.' })
    return JSON.stringify({ bookings: bookings.map(b => ({
      id: b.id, date: b.start_time?.split('T')[0],
      time: b.start_time ? new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }) : null,
      status: b.status, service: b.service_type, rate: b.hourly_rate,
      price: b.price ? `$${(b.price / 100).toFixed(0)}` : null,
      payment: b.payment_status, cleaner: (b.team_members as unknown as { name: string })?.name || 'TBD',
      recurring: b.recurring_type !== 'one_time' ? b.recurring_type : null,
    }))})
  } catch (err) {
    await yinezError('lookup_bookings', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

async function handleRescheduleBooking(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account found' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    const bookingId = input.booking_id as string
    // Scope the fetch to the caller's tenant (derived from the conversation above,
    // never from the booking row) so a foreign booking_id resolves to nothing.
    const { data: booking } = await supabaseAdmin.from('bookings').select('id, start_time, recurring_type, client_id, tenant_id').eq('id', bookingId).eq('tenant_id', tid).single()
    if (!booking) return JSON.stringify({ error: 'Booking not found' })
    // Client-ownership: the booking must belong to the caller, not merely to their tenant.
    if (booking.client_id !== convo.client_id) return JSON.stringify({ error: 'not_your_booking', message: 'That booking is not on your account.' })
    if (booking.recurring_type === 'one_time' || !booking.recurring_type) return JSON.stringify({ error: 'policy_violation', message: 'First-time and one-time bookings cannot be rescheduled.' })
    const daysUntil = Math.ceil((new Date(booking.start_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 7) return JSON.stringify({ error: 'policy_violation', message: `Booking is in ${daysUntil} days. Need 7 days notice.` })
    const parsed = parseTime(input.new_time as string)
    if (!parsed) return JSON.stringify({ error: 'Invalid time' })
    const newStart = `${input.new_date}T${parsed.hours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}:00`
    const newEnd = `${input.new_date}T${(parsed.hours + 2).toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}:00`
    // Does NOT move the booking — only the policy checks above run here.
    // Flags it for owner approval instead of mutating start_time/end_time
    // directly; the owner reviews and applies the actual change from the
    // dashboard. (nycmaid cc92e0e6 parity — cancel/reschedule are requests,
    // not self-executing actions, on a client channel.)
    const { error: taskError } = await supabaseAdmin.from('admin_tasks').insert({
      tenant_id: tid,
      type: 'reschedule_request',
      priority: 'normal',
      title: `Reschedule request — ${booking.start_time.split('T')[0]} → ${input.new_date}`,
      description: `Client requested moving booking ${bookingId} from ${booking.start_time} to ${input.new_date} ${input.new_time}. Not yet applied — review and reschedule from the dashboard.`,
      related_type: 'booking',
      related_id: bookingId,
    })
    if (taskError) {
      await yinezError('reschedule_booking', taskError, conversationId)
      return JSON.stringify({ error: 'Failed', message: 'Could not submit the reschedule request — please try again or contact us.' })
    }
    await notify({
      tenantId: tid,
      type: 'reschedule_requested',
      title: `Reschedule requested — booking ${bookingId}`,
      message: `Client requested moving their ${booking.start_time.split('T')[0]} booking to ${input.new_date} ${input.new_time}. Pending your approval.`,
      booking_id: bookingId,
    }).catch(() => {})
    return JSON.stringify({ success: true, pending: true, message: `Got it — I've sent your request to move this to ${input.new_date} at ${input.new_time} to our team for approval. It's not confirmed yet; we'll follow up shortly.` })
  } catch (err) {
    await yinezError('reschedule_booking', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

async function handleCancelBooking(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account found' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    const bookingId = input.booking_id as string
    const reason = (input.reason as string) || 'Client requested'
    // Scope the fetch to the caller's tenant (derived from the conversation above,
    // never from the booking row) so a foreign booking_id resolves to nothing.
    const { data: booking } = await supabaseAdmin.from('bookings').select('id, start_time, recurring_type, client_id, clients(name), tenant_id').eq('id', bookingId).eq('tenant_id', tid).single()
    if (!booking) return JSON.stringify({ error: 'Booking not found' })
    // Client-ownership: the booking must belong to the caller, not merely to their tenant.
    if (booking.client_id !== convo.client_id) return JSON.stringify({ error: 'not_your_booking', message: 'That booking is not on your account.' })
    if (booking.recurring_type === 'one_time' || !booking.recurring_type) return JSON.stringify({ error: 'policy_violation', message: 'First-time bookings cannot be cancelled.' })
    const daysUntil = Math.ceil((new Date(booking.start_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 7) return JSON.stringify({ error: 'policy_violation', message: `Booking is in ${daysUntil} days. Need 7 days notice.` })
    // Does NOT cancel the booking — only the policy checks above run here.
    // Flags it for owner approval instead of mutating status directly; the
    // owner reviews and applies the actual cancellation from the dashboard.
    // (nycmaid cc92e0e6 parity — cancel/reschedule are requests, not
    // self-executing actions, on a client channel.)
    const clientName = (booking.clients as unknown as { name: string })?.name || 'Client'
    const { error: taskError } = await supabaseAdmin.from('admin_tasks').insert({
      tenant_id: tid,
      type: 'cancellation_request',
      priority: 'normal',
      title: `Cancellation request — ${clientName}, ${booking.start_time.split('T')[0]}`,
      description: `${clientName} requested cancelling booking ${bookingId} (${booking.start_time.split('T')[0]}). Reason: ${reason}. Not yet applied — review and cancel from the dashboard.`,
      related_type: 'booking',
      related_id: bookingId,
    })
    if (taskError) {
      await yinezError('cancel_booking', taskError, conversationId)
      return JSON.stringify({ error: 'Failed', message: 'Could not submit the cancellation request — please try again or contact us.' })
    }
    await notify({
      tenantId: tid,
      type: 'cancellation_requested',
      title: `Cancellation requested — ${clientName}`,
      message: `${clientName} requested cancelling ${booking.start_time.split('T')[0]} via SMS. Reason: ${reason}. Pending your approval.`,
      booking_id: bookingId,
    }).catch(() => {})
    return JSON.stringify({ success: true, pending: true, message: `Got it — I've sent your cancellation request to our team for approval. It's not cancelled yet; we'll follow up shortly.` })
  } catch (err) {
    await yinezError('cancel_booking', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

async function handleManageRecurring(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const action = input.action as string
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    // Find their active recurring schedule
    let scheduleId = input.schedule_id as string | undefined
    if (!scheduleId) {
      const { data: schedule } = await supabaseAdmin.from('recurring_schedules')
        .select('id').eq('tenant_id', tid).eq('client_id', convo.client_id).eq('status', 'active').limit(1).single()
      scheduleId = schedule?.id
    }
    if (!scheduleId) return JSON.stringify({ error: 'No active recurring schedule found' })

    if (action === 'pause') {
      const pauseUntil = input.pause_until as string
      const { error: pauseError } = await supabaseAdmin.from('recurring_schedules').update({ status: 'paused', paused_until: pauseUntil || null }).eq('id', scheduleId).eq('tenant_id', tid)
      if (pauseError) {
        await yinezError('manage_recurring:pause', pauseError, conversationId)
        return JSON.stringify({ error: 'Failed', message: 'Could not pause — please try again or contact us.' })
      }
      return JSON.stringify({ success: true, message: `Recurring paused${pauseUntil ? ` until ${pauseUntil}` : ''}` })
    }
    if (action === 'resume') {
      const { error: resumeError } = await supabaseAdmin.from('recurring_schedules').update({ status: 'active', paused_until: null }).eq('id', scheduleId).eq('tenant_id', tid)
      if (resumeError) {
        await yinezError('manage_recurring:resume', resumeError, conversationId)
        return JSON.stringify({ error: 'Failed', message: 'Could not resume — please try again or contact us.' })
      }
      return JSON.stringify({ success: true, message: 'Recurring resumed' })
    }
    if (action === 'cancel') {
      const { error: recurringCancelError } = await supabaseAdmin.from('recurring_schedules').update({ status: 'cancelled' }).eq('id', scheduleId).eq('tenant_id', tid)
      if (recurringCancelError) {
        await yinezError('manage_recurring:cancel', recurringCancelError, conversationId)
        return JSON.stringify({ error: 'Failed', message: 'Could not cancel — please try again or contact us.' })
      }
      await notify({ type: 'recurring_cancelled', title: 'Recurring Cancelled', message: `Client cancelled recurring schedule via SMS` }).catch(() => {})
      return JSON.stringify({ success: true, message: 'Recurring schedule cancelled' })
    }
    return JSON.stringify({ error: `Unknown action: ${action}` })
  } catch (err) {
    await yinezError('manage_recurring', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

async function handleReportIssue(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const description = input.description as string
    const severity = (input.severity as string) || 'medium'
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, name, phone, tenant_id').eq('id', conversationId).single()
    const tid = (convo as { tenant_id?: string } | null)?.tenant_id || NYCMAID_TENANT_ID

    await supabaseAdmin.from('yinez_memory').insert({
      tenant_id: tid, client_id: convo?.client_id || null, type: 'issue', content: description, source: 'yinez',
    })

    await notify({
      type: 'client_issue', title: `Issue — ${convo?.name || convo?.phone || 'Client'} (${severity})`,
      message: `${convo?.name || 'Client'} reported: ${description}`,
    }).catch(() => {})

    return JSON.stringify({ success: true, message: 'Issue logged and team notified' })
  } catch (err) {
    await yinezError('report_issue', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

async function handleRequestCallback(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const reason = (input.reason as string) || 'Client requested callback'
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, name, phone, tenant_id').eq('id', conversationId).single()
    const tid = (convo as { tenant_id?: string } | null)?.tenant_id || NYCMAID_TENANT_ID

    // Get last few messages for context
    const { data: msgs } = await supabaseAdmin.from('sms_conversation_messages')
      .select('direction, message').eq('tenant_id', tid).eq('conversation_id', conversationId)
      .order('created_at', { ascending: false }).limit(10)
    const context = (msgs || []).reverse().map(m => `${m.direction === 'inbound' ? 'Client' : 'Yinez'}: ${m.message}`).join('\n')

    // Lock the conversation for 24h. While locked, the Telnyx webhook
    // short-circuits every inbound with a canned "owner is on this" ack and
    // routes the message to Telegram instead of any flow or Yinez. Released
    // when an admin clears it in the UI (or after expiry).
    const lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await supabaseAdmin
      .from('sms_conversations')
      .update({ escalation_locked_until: lockUntil })
      .eq('id', conversationId)
      .eq('tenant_id', tid)
      .then(() => {}, () => {})

    await notify({
      type: 'callback_requested',
      title: `Callback — ${convo?.name || convo?.phone || 'Client'}`,
      message: `${convo?.name || 'Client'} wants a callback. Phone: ${convo?.phone}\nReason: ${reason}\n\nContext:\n${context}`,
    }).catch(() => {})

    return JSON.stringify({ success: true, message: 'Team notified — they will call within 15 minutes' })
  } catch (err) {
    await yinezError('request_callback', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

export async function handleBookingDetails(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account found' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    let bookingId = input.booking_id as string | undefined
    if (!bookingId) {
      // Get most recent completed or in-progress booking
      const { data: recent } = await supabaseAdmin.from('bookings')
        .select('id').eq('tenant_id', tid).eq('client_id', convo.client_id)
        .in('status', ['completed', 'in_progress', 'checked_in'])
        .order('start_time', { ascending: false }).limit(1).single()
      bookingId = recent?.id
    }
    if (!bookingId) {
      // Try any booking
      const { data: any } = await supabaseAdmin.from('bookings')
        .select('id').eq('tenant_id', tid).eq('client_id', convo.client_id)
        .order('start_time', { ascending: false }).limit(1).single()
      bookingId = any?.id
    }
    if (!bookingId) return JSON.stringify({ error: 'No bookings found for this client' })

    const { data: booking } = await supabaseAdmin.from('bookings')
      .select('id, client_id, start_time, end_time, check_in_time, check_out_time, check_in_location, check_out_location, actual_hours, hourly_rate, price, team_member_pay, payment_status, payment_method, status, service_type, team_members(name), clients(name, address), client_properties(address)')
      .eq('id', bookingId).eq('tenant_id', tid).single()

    if (!booking) return JSON.stringify({ error: 'Booking not found' })
    // Client-ownership: booking_id is caller-supplied. A same-tenant fetch alone lets a
    // client read another client's booking details; require the booking to be the caller's.
    if (booking.client_id !== convo.client_id) return JSON.stringify({ error: 'not_your_booking', message: 'That booking is not on your account.' })

    // Show the booking's property address (multi-address parity) — overlays the
    // per-booking property onto the client display before we read it.
    const { applyPropertyToBookingClient } = await import('@/lib/client-properties')
    applyPropertyToBookingClient(booking as Parameters<typeof applyPropertyToBookingClient>[0])

    const client = booking.clients as unknown as { name: string; address: string } | null
    const cleaner = booking.team_members as unknown as { name: string } | null

    // Calculate times
    const formatTime = (t: string | null) => {
      if (!t) return null
      return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })
    }

    const checkInTime = formatTime(booking.check_in_time)
    const checkOutTime = formatTime(booking.check_out_time)

    // Calculate actual duration from check-in/out
    // Rule: after 10 minutes past a 30-min mark, rounds up to next 30 minutes
    let calculatedHours: number | null = null
    let rawMinutes: number | null = null
    if (booking.check_in_time && booking.check_out_time) {
      const diffMs = new Date(booking.check_out_time).getTime() - new Date(booking.check_in_time).getTime()
      rawMinutes = Math.round(diffMs / (1000 * 60))
      const fullHalfHours = Math.floor(rawMinutes / 30)
      const remainder = rawMinutes % 30
      // If past 10 min into the next 30-min block, round up
      calculatedHours = remainder > 10 ? (fullHalfHours + 1) * 0.5 : fullHalfHours * 0.5
    }

    const hours = booking.actual_hours || calculatedHours || null
    const rate = booking.hourly_rate || 69
    const total = hours ? Math.round(hours * rate) : null

    // Parse check-in location
    let checkInLocation = ''
    if (booking.check_in_location) {
      try {
        const loc = typeof booking.check_in_location === 'string' ? JSON.parse(booking.check_in_location) : booking.check_in_location
        if (loc.latitude && loc.longitude) {
          checkInLocation = `GPS: ${Number(loc.latitude).toFixed(6)}, ${Number(loc.longitude).toFixed(6)}`
          if (loc.address) checkInLocation = loc.address
        }
      } catch {}
    }

    let checkOutLocation = ''
    if (booking.check_out_location) {
      try {
        const loc = typeof booking.check_out_location === 'string' ? JSON.parse(booking.check_out_location) : booking.check_out_location
        if (loc.latitude && loc.longitude) {
          checkOutLocation = `GPS: ${Number(loc.latitude).toFixed(6)}, ${Number(loc.longitude).toFixed(6)}`
          if (loc.address) checkOutLocation = loc.address
        }
      } catch {}
    }

    // Get payment records
    const { data: payments } = await supabaseAdmin.from('payments')
      .select('amount, tip, method, created_at')
      .eq('tenant_id', tid)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(3)

    return JSON.stringify({
      booking_id: bookingId,
      date: booking.start_time?.split('T')[0],
      scheduled_time: formatTime(booking.start_time),
      service_type: booking.service_type,
      status: booking.status,
      cleaner: cleaner?.name || 'unassigned',
      client_address: client?.address || 'not on file',
      check_in: {
        time: checkInTime,
        location: checkInLocation || 'not recorded',
        raw: booking.check_in_time,
      },
      check_out: {
        time: checkOutTime,
        location: checkOutLocation || 'not recorded',
        raw: booking.check_out_time,
      },
      hours: {
        raw_minutes: rawMinutes,
        billed_hours: hours,
        calculated_hours: calculatedHours,
        rounding_rule: 'After 10 minutes past a 30-min mark, rounds up to the next 30 minutes',
        explanation: rawMinutes ? `${rawMinutes} minutes total. ${rawMinutes % 30 > 10 ? `${rawMinutes % 30} min past the half hour → rounded up to ${hours} hours` : `${rawMinutes % 30} min into the half hour → stays at ${hours} hours`}` : null,
      },
      rate_per_hour: rate,
      total: total ? `$${total}` : 'not calculated',
      math: hours ? `${hours} hours × $${rate}/hr = $${total}` : 'check-in/out times needed for calculation',
      payment: {
        status: booking.payment_status,
        method: booking.payment_method,
        records: (payments || []).map(p => ({
          amount: `$${(p.amount / 100).toFixed(2)}`,
          tip: p.tip ? `$${(p.tip / 100).toFixed(2)}` : null,
          method: p.method,
          date: p.created_at?.split('T')[0],
        })),
      },
    })
  } catch (err) {
    await yinezError('booking_details', err, conversationId)
    return JSON.stringify({ error: 'Failed to load booking details' })
  }
}

async function handleRemember(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    // Whitelist memory types so Yinez can't invent types that won't surface in any context
    // query (loadContext only pulls type IN ('lesson','rule','instruction') for globals,
    // so a typo'd "fact" would silently never appear). Map unknown types to 'observation'.
    const PER_CLIENT = ['preference', 'observation', 'issue', 'payment', 'instruction']
    const GLOBAL = ['lesson', 'rule', 'instruction']
    const ALL = new Set([...PER_CLIENT, ...GLOBAL])
    let type = (input.type as string) || 'observation'
    if (!ALL.has(type)) {
      // Coerce instead of rejecting — Yinez occasionally invents a synonym; prefer to
      // accept the data and normalize than to throw and lose the lesson.
      type = 'observation'
    }
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    const tid = (convo as { tenant_id?: string } | null)?.tenant_id || NYCMAID_TENANT_ID
    await supabaseAdmin.from('yinez_memory').insert({
      tenant_id: tid,
      client_id: convo?.client_id || null,
      type,
      content: input.content as string,
      source: 'yinez',
    })
    return JSON.stringify({ success: true, type })
  } catch (err) {
    await yinezError('remember', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

// Route tool call to handler. tenantId optional during the Phase 3.2 sweep —
// every handler signature gets it next, but for now we accept and ignore so
// the dispatcher signature lines up with the runTool caller.
export async function handleTool(name: string, input: Record<string, unknown>, conversationId: string, result: YinezResult, _tenantId?: string): Promise<string> {
  switch (name) {
    case 'create_booking': return handleCreateBooking(input, conversationId, result)
    case 'add_to_waitlist': return handleAddToWaitlist(input, conversationId)
    case 'get_quote': return handleGetQuote(input)
    case 'get_account': return handleGetAccount(conversationId)
    case 'update_account': return handleUpdateAccount(input, conversationId)
    case 'send_pin': return handleSendPin(conversationId)
    case 'resend_confirmation': return handleResendConfirmation(input, conversationId)
    case 'check_payment': return handleCheckPayment(conversationId)
    case 'confirm_payment': return handleConfirmPayment(input, conversationId)
    case 'get_invoice': return handleGetInvoice(input, conversationId)
    case 'lookup_bookings': return handleLookupBookings(input, conversationId)
    case 'reschedule_booking': return handleRescheduleBooking(input, conversationId)
    case 'cancel_booking': return handleCancelBooking(input, conversationId)
    case 'manage_recurring': return handleManageRecurring(input, conversationId)
    case 'booking_details': return handleBookingDetails(input, conversationId)
    case 'report_issue': return handleReportIssue(input, conversationId)
    case 'request_callback': return handleRequestCallback(input, conversationId)
    case 'remember': return handleRemember(input, conversationId)
    default: return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

