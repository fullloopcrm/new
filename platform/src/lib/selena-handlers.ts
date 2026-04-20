/**
 * Selena Tool Handlers — ported from nycmaid (2026-04-19), made tenant-aware.
 * Wired into selena.ts via routeExtendedTool().
 */
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getTenantTelnyx(tenantId: string): Promise<{ key?: string; phone?: string }> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('telnyx_api_key, telnyx_phone')
    .eq('id', tenantId)
    .single()
  return { key: data?.telnyx_api_key || undefined, phone: data?.telnyx_phone || undefined }
}

async function sendTenantEmail(tenantId: string, opts: { to: string; subject: string; html: string }) {
  const { data: t } = await supabaseAdmin
    .from('tenants')
    .select('resend_api_key, email_from, name')
    .eq('id', tenantId)
    .single()
  return sendEmail({
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    from: t?.email_from || undefined,
    resendApiKey: t?.resend_api_key || undefined,
  })
}

async function getConvoClientId(conversationId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('sms_conversations')
    .select('client_id')
    .eq('id', conversationId)
    .single()
  return data?.client_id || null
}

function fmtTime(t: string | null, tz = 'America/New_York'): string | null {
  if (!t) return null
  try {
    return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz })
  } catch {
    return null
  }
}

async function selenaErr(tenantId: string, ctx: string, err: unknown, conversationId?: string) {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`[Selena:${tenantId}] ${ctx}:`, err)
  await notify({
    tenantId,
    type: 'selena_error' as never,
    title: `Selena Error — ${ctx}`,
    message: `${msg}${conversationId ? `\nConversation: ${conversationId}` : ''}`,
  }).catch(() => {})
}

// ─── Tool Handlers ──────────────────────────────────────────────────────────

export async function handleGetAccount(tenantId: string, conversationId: string): Promise<string> {
  try {
    const clientId = await getConvoClientId(conversationId)
    if (!clientId) return JSON.stringify({ error: 'No account found' })

    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('name, email, phone, address, pin, created_at')
      .eq('tenant_id', tenantId).eq('id', clientId).single()

    const { data: upcoming } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, status, service_type, hourly_rate, payment_status, team_members(name)')
      .eq('tenant_id', tenantId).eq('client_id', clientId)
      .in('status', ['pending', 'scheduled', 'confirmed', 'in_progress'])
      .gte('start_time', new Date().toISOString())
      .order('start_time').limit(5)

    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount_cents, tip_cents, method, created_at')
      .eq('tenant_id', tenantId).eq('client_id', clientId)
      .order('created_at', { ascending: false }).limit(5)

    const { data: memories } = await supabaseAdmin
      .from('selena_memory')
      .select('type, content')
      .eq('tenant_id', tenantId).eq('client_id', clientId).limit(10)

    const { data: recurring } = await supabaseAdmin
      .from('recurring_schedules')
      .select('id, recurring_type, day_of_week, preferred_time, status, team_members(name)')
      .eq('tenant_id', tenantId).eq('client_id', clientId).eq('status', 'active')

    return JSON.stringify({
      client: {
        name: client?.name, email: client?.email, phone: client?.phone, address: client?.address,
        member_since: client?.created_at?.split('T')[0],
      },
      upcoming: (upcoming || []).map(b => ({
        id: b.id, date: b.start_time?.split('T')[0], time: fmtTime(b.start_time),
        status: b.status, service: b.service_type, rate: b.hourly_rate,
        payment: b.payment_status,
        team_member: (b.team_members as unknown as { name: string } | null)?.name || 'TBD',
      })),
      recent_payments: (payments || []).map(p => ({
        amount: `$${((p.amount_cents || 0) / 100).toFixed(0)}`,
        tip: p.tip_cents ? `$${(p.tip_cents / 100).toFixed(0)}` : null,
        method: p.method, date: p.created_at?.split('T')[0],
      })),
      recurring: (recurring || []).map(r => ({
        id: r.id, type: r.recurring_type, day: r.day_of_week, time: r.preferred_time,
        team_member: (r.team_members as unknown as { name: string } | null)?.name || 'TBD',
      })),
      preferences: (memories || []).map(m => m.content),
    })
  } catch (err) {
    await selenaErr(tenantId, 'get_account', err, conversationId)
    return JSON.stringify({ error: 'Failed to load account' })
  }
}

export async function handleUpdateAccount(tenantId: string, input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const clientId = await getConvoClientId(conversationId)
    if (!clientId) return JSON.stringify({ error: 'No account found' })
    const field = input.field as string
    const value = input.value as string
    const allowed = ['address', 'email', 'phone', 'name']
    if (!allowed.includes(field)) return JSON.stringify({ error: `Cannot update ${field}` })
    await supabaseAdmin.from('clients').update({ [field]: value }).eq('id', clientId).eq('tenant_id', tenantId)
    return JSON.stringify({ success: true, message: `${field} updated to ${value}` })
  } catch (err) {
    await selenaErr(tenantId, 'update_account', err, conversationId)
    return JSON.stringify({ error: 'Failed to update' })
  }
}

export async function handleSendPin(tenantId: string, conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin
      .from('sms_conversations').select('client_id, phone').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account found' })

    const { data: client } = await supabaseAdmin
      .from('clients').select('id, pin, name, phone')
      .eq('tenant_id', tenantId).eq('id', convo.client_id).single()
    if (!client) return JSON.stringify({ error: 'Client not found' })

    let pin = client.pin
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      pin = Math.floor(100000 + Math.random() * 900000).toString()
      await supabaseAdmin.from('clients').update({ pin }).eq('id', client.id).eq('tenant_id', tenantId)
    }

    const phone = client.phone || convo.phone
    const tlx = await getTenantTelnyx(tenantId)
    if (phone && tlx.key && tlx.phone) {
      await sendSMS({
        to: phone,
        body: `Hi ${client.name || 'there'}! Your portal PIN is: ${pin}\n\nLog in to your client portal. 😊`,
        telnyxApiKey: tlx.key,
        telnyxPhone: tlx.phone,
      })
    }
    return JSON.stringify({ success: true, message: `PIN sent to ${phone}` })
  } catch (err) {
    await selenaErr(tenantId, 'send_pin', err, conversationId)
    return JSON.stringify({ error: 'Failed to send PIN' })
  }
}

export async function handleResendConfirmation(tenantId: string, input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const clientId = await getConvoClientId(conversationId)
    if (!clientId) return JSON.stringify({ error: 'No account found' })

    let bookingId = input.booking_id as string | undefined
    if (!bookingId) {
      const { data: next } = await supabaseAdmin
        .from('bookings').select('id')
        .eq('tenant_id', tenantId).eq('client_id', clientId)
        .in('status', ['pending', 'scheduled']).gte('start_time', new Date().toISOString())
        .order('start_time').limit(1).single()
      bookingId = next?.id
    }
    if (!bookingId) return JSON.stringify({ error: 'No upcoming booking found' })

    const { data: booking } = await supabaseAdmin.from('bookings')
      .select('start_time, service_type, hourly_rate, clients(name, email, pin), team_members(name), tenants(name)')
      .eq('id', bookingId).eq('tenant_id', tenantId).single()
    if (!booking) return JSON.stringify({ error: 'Booking not found' })

    const client = booking.clients as unknown as { name: string; email: string; pin: string } | null
    if (!client?.email) return JSON.stringify({ error: 'No email on file' })

    const tm = booking.team_members as unknown as { name: string } | null
    const tenant = booking.tenants as unknown as { name: string } | null
    const date = new Date(booking.start_time).toLocaleDateString('en-US', {
      timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric',
    })
    const time = fmtTime(booking.start_time)

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;color:#1a1a1a">
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:600">Booking Confirmation</h2>
        <p style="margin:0 0 16px">Hi ${client.name}! Your booking is confirmed:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;background:#f9fafb;border-radius:8px">
          <tr><td style="padding:16px">
            <p style="margin:0 0 8px;color:#666">Date: <strong>${date}</strong></p>
            <p style="margin:0 0 8px;color:#666">Time: <strong>${time}</strong></p>
            <p style="margin:0 0 8px;color:#666">Service: <strong>${booking.service_type}</strong></p>
            <p style="margin:0 0 8px;color:#666">Rate: <strong>$${booking.hourly_rate}/hr</strong></p>
            ${tm ? `<p style="margin:0 0 8px;color:#666">Pro: <strong>${tm.name}</strong></p>` : ''}
            ${client.pin ? `<p style="margin:0;color:#666">Portal PIN: <strong>${client.pin}</strong></p>` : ''}
          </td></tr>
        </table>
        <p style="margin:0;font-size:13px;color:#999">${tenant?.name || ''}</p>
      </div>`

    await sendTenantEmail(tenantId, {
      to: client.email,
      subject: `Booking Confirmed — ${date} — ${tenant?.name || ''}`,
      html,
    })
    return JSON.stringify({ success: true, message: `Confirmation resent to ${client.email}` })
  } catch (err) {
    await selenaErr(tenantId, 'resend_confirmation', err, conversationId)
    return JSON.stringify({ error: 'Failed to resend' })
  }
}

export async function handleCheckPayment(tenantId: string, conversationId: string): Promise<string> {
  try {
    const clientId = await getConvoClientId(conversationId)
    if (!clientId) return JSON.stringify({ error: 'No account' })
    const { data: unpaid } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, price, hourly_rate, actual_hours, payment_status, service_type')
      .eq('tenant_id', tenantId).eq('client_id', clientId)
      .in('status', ['completed', 'in_progress', 'scheduled'])
      .neq('payment_status', 'paid').order('start_time', { ascending: false }).limit(5)
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount_cents, tip_cents, method, created_at')
      .eq('tenant_id', tenantId).eq('client_id', clientId)
      .order('created_at', { ascending: false }).limit(5)
    return JSON.stringify({
      outstanding: (unpaid || []).map(b => ({
        date: b.start_time?.split('T')[0],
        amount: b.price ? `$${(b.price / 100).toFixed(0)}` : 'TBD',
        status: b.payment_status,
      })),
      recent_payments: (payments || []).map(p => ({
        amount: `$${((p.amount_cents || 0) / 100).toFixed(0)}`,
        tip: p.tip_cents ? `$${(p.tip_cents / 100).toFixed(0)}` : null,
        method: p.method, date: p.created_at?.split('T')[0],
      })),
    })
  } catch (err) {
    await selenaErr(tenantId, 'check_payment', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

export async function handleConfirmPayment(tenantId: string, input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const method = (input.method as string) || 'zelle'
    const senderName = (input.sender_name as string)?.trim() || null
    const clientId = await getConvoClientId(conversationId)
    if (!clientId) return JSON.stringify({ error: 'No account' })

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, clients(name)')
      .eq('tenant_id', tenantId).eq('client_id', clientId)
      .neq('payment_status', 'paid').not('fifteen_min_alert_time', 'is', null)
      .order('start_time', { ascending: false }).limit(1).single()

    if (booking && senderName) {
      await supabaseAdmin.from('bookings').update({ payment_sender_name: senderName })
        .eq('id', booking.id).eq('tenant_id', tenantId)
    }

    if (booking) {
      const clientName = (booking.clients as unknown as { name: string } | null)?.name || 'Client'
      const senderLine = senderName ? ` Payer: ${senderName}.` : ''
      await notify({
        tenantId,
        type: 'payment_claimed' as never,
        title: `${clientName} says paid (${method})`,
        message: `${clientName} confirmed ${method} payment.${senderLine}`,
      }).catch(() => {})
    }
    return JSON.stringify({ success: true, method, sender_name: senderName })
  } catch (err) {
    await selenaErr(tenantId, 'confirm_payment', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

export async function handleGetInvoice(tenantId: string, _input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const clientId = await getConvoClientId(conversationId)
    if (!clientId) return JSON.stringify({ error: 'No account' })

    const { data: client } = await supabaseAdmin
      .from('clients').select('name, email')
      .eq('tenant_id', tenantId).eq('id', clientId).single()
    if (!client?.email) return JSON.stringify({ error: 'No email on file — ask client for email first' })

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('amount_cents, tip_cents, method, created_at, booking_id')
      .eq('tenant_id', tenantId).eq('client_id', clientId)
      .order('created_at', { ascending: false }).limit(1).single()
    if (!payment) return JSON.stringify({ error: 'No payments found' })

    const total = ((payment.amount_cents || 0) / 100).toFixed(2)
    const tip = payment.tip_cents ? (payment.tip_cents / 100).toFixed(2) : '0.00'
    const service = (((payment.amount_cents || 0) - (payment.tip_cents || 0)) / 100).toFixed(2)

    const { data: tenant } = await supabaseAdmin.from('tenants').select('name').eq('id', tenantId).single()

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;color:#1a1a1a">
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:600">Payment Receipt</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;background:#f9fafb;border-radius:8px">
          <tr><td style="padding:16px">
            <p style="margin:0 0 8px;color:#666">Date: <strong>${payment.created_at?.split('T')[0]}</strong></p>
            <p style="margin:0 0 8px;color:#666">Service: <strong>$${service}</strong></p>
            ${Number(tip) > 0 ? `<p style="margin:0 0 8px;color:#666">Tip: <strong>$${tip}</strong></p>` : ''}
            <p style="margin:0 0 8px;font-size:18px;font-weight:700">Total: $${total}</p>
            <p style="margin:0;color:#666">Method: <strong>${payment.method}</strong></p>
          </td></tr>
        </table>
        <p style="margin:0;font-size:13px;color:#999">${tenant?.name || ''}</p>
      </div>`

    await sendTenantEmail(tenantId, {
      to: client.email,
      subject: `Payment Receipt — $${total} — ${tenant?.name || ''}`,
      html,
    })
    return JSON.stringify({ success: true, message: `Receipt sent to ${client.email}` })
  } catch (err) {
    await selenaErr(tenantId, 'get_invoice', err, conversationId)
    return JSON.stringify({ error: 'Failed to send receipt' })
  }
}

export async function handleLookupBookings(tenantId: string, input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const clientId = await getConvoClientId(conversationId)
    if (!clientId) return JSON.stringify({ error: 'No account' })
    const filter = (input.status_filter as string) || 'upcoming'
    const now = new Date().toISOString()
    let query = supabaseAdmin.from('bookings')
      .select('id, start_time, end_time, status, service_type, hourly_rate, price, payment_status, team_members(name), actual_hours, recurring_type')
      .eq('tenant_id', tenantId).eq('client_id', clientId)
      .order('start_time', { ascending: filter === 'upcoming' }).limit(5)
    if (filter === 'upcoming') {
      query = query.gte('start_time', now).in('status', ['pending', 'scheduled', 'confirmed', 'in_progress'])
    } else if (filter === 'completed') {
      query = query.eq('status', 'completed').order('start_time', { ascending: false })
    }
    const { data: bookings } = await query
    if (!bookings?.length) return JSON.stringify({ bookings: [], message: 'No bookings found.' })
    return JSON.stringify({
      bookings: bookings.map(b => ({
        id: b.id, date: b.start_time?.split('T')[0], time: fmtTime(b.start_time),
        status: b.status, service: b.service_type, rate: b.hourly_rate,
        price: b.price ? `$${(b.price / 100).toFixed(0)}` : null,
        payment: b.payment_status,
        team_member: (b.team_members as unknown as { name: string } | null)?.name || 'TBD',
        recurring: b.recurring_type !== 'one_time' ? b.recurring_type : null,
      })),
    })
  } catch (err) {
    await selenaErr(tenantId, 'lookup_bookings', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

function parseTime(t: string): { hours: number; minutes: number } | null {
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])$/i)
  if (!m) return null
  let hours = parseInt(m[1])
  const minutes = parseInt(m[2] || '0')
  if (m[3].toUpperCase() === 'PM' && hours < 12) hours += 12
  if (m[3].toUpperCase() === 'AM' && hours === 12) hours = 0
  return { hours, minutes }
}

export async function handleRescheduleBooking(tenantId: string, input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const bookingId = input.booking_id as string
    const { data: booking } = await supabaseAdmin
      .from('bookings').select('id, start_time, recurring_type, client_id, tenants(reschedule_notice_days)')
      .eq('id', bookingId).eq('tenant_id', tenantId).single()
    if (!booking) return JSON.stringify({ error: 'Booking not found' })
    if (booking.recurring_type === 'one_time' || !booking.recurring_type) {
      return JSON.stringify({ error: 'policy_violation', message: 'First-time bookings cannot be rescheduled.' })
    }
    const noticeDays = (booking.tenants as unknown as { reschedule_notice_days: number } | null)?.reschedule_notice_days || 2
    const daysUntil = Math.ceil((new Date(booking.start_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysUntil < noticeDays) {
      return JSON.stringify({ error: 'policy_violation', message: `Booking is in ${daysUntil} days. Need ${noticeDays} days notice.` })
    }
    const parsed = parseTime(input.new_time as string)
    if (!parsed) return JSON.stringify({ error: 'Invalid time' })
    const newStart = `${input.new_date}T${parsed.hours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}:00`
    const newEnd = `${input.new_date}T${((parsed.hours + 2) % 24).toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}:00`
    await supabaseAdmin.from('bookings').update({
      start_time: newStart, end_time: newEnd,
      notes: `Rescheduled via Selena from ${booking.start_time.split('T')[0]}`,
    }).eq('id', bookingId).eq('tenant_id', tenantId)
    return JSON.stringify({ success: true, message: `Rescheduled to ${input.new_date} at ${input.new_time}.` })
  } catch (err) {
    await selenaErr(tenantId, 'reschedule_booking', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

export async function handleCancelBooking(tenantId: string, input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const bookingId = input.booking_id as string
    const reason = (input.reason as string) || 'Client requested'
    const { data: booking } = await supabaseAdmin
      .from('bookings').select('id, start_time, recurring_type, clients(name), tenants(reschedule_notice_days)')
      .eq('id', bookingId).eq('tenant_id', tenantId).single()
    if (!booking) return JSON.stringify({ error: 'Booking not found' })
    if (booking.recurring_type === 'one_time' || !booking.recurring_type) {
      return JSON.stringify({ error: 'policy_violation', message: 'First-time bookings cannot be cancelled.' })
    }
    const noticeDays = (booking.tenants as unknown as { reschedule_notice_days: number } | null)?.reschedule_notice_days || 2
    const daysUntil = Math.ceil((new Date(booking.start_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysUntil < noticeDays) {
      return JSON.stringify({ error: 'policy_violation', message: `Booking is in ${daysUntil} days. Need ${noticeDays} days notice.` })
    }
    await supabaseAdmin.from('bookings').update({
      status: 'cancelled', notes: `Cancelled via Selena: ${reason}`,
    }).eq('id', bookingId).eq('tenant_id', tenantId)
    const clientName = (booking.clients as unknown as { name: string } | null)?.name || 'Client'
    await notify({
      tenantId,
      type: 'booking_cancelled' as never,
      title: `Cancelled — ${clientName}`,
      message: `${clientName} cancelled ${booking.start_time.split('T')[0]} via SMS. Reason: ${reason}`,
    }).catch(() => {})
    return JSON.stringify({ success: true })
  } catch (err) {
    await selenaErr(tenantId, 'cancel_booking', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

export async function handleManageRecurring(tenantId: string, input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const action = input.action as string
    const clientId = await getConvoClientId(conversationId)
    if (!clientId) return JSON.stringify({ error: 'No account' })

    let scheduleId = input.schedule_id as string | undefined
    if (!scheduleId) {
      const { data } = await supabaseAdmin
        .from('recurring_schedules').select('id')
        .eq('tenant_id', tenantId).eq('client_id', clientId).eq('status', 'active')
        .limit(1).single()
      scheduleId = data?.id
    }
    if (!scheduleId) return JSON.stringify({ error: 'No active recurring schedule found' })

    if (action === 'pause') {
      const pauseUntil = input.pause_until as string | undefined
      await supabaseAdmin.from('recurring_schedules').update({
        status: 'paused', paused_until: pauseUntil || null,
      }).eq('id', scheduleId).eq('tenant_id', tenantId)
      return JSON.stringify({ success: true, message: `Recurring paused${pauseUntil ? ` until ${pauseUntil}` : ''}` })
    }
    if (action === 'resume') {
      await supabaseAdmin.from('recurring_schedules').update({
        status: 'active', paused_until: null,
      }).eq('id', scheduleId).eq('tenant_id', tenantId)
      return JSON.stringify({ success: true, message: 'Recurring resumed' })
    }
    if (action === 'cancel') {
      await supabaseAdmin.from('recurring_schedules').update({ status: 'cancelled' })
        .eq('id', scheduleId).eq('tenant_id', tenantId)
      await notify({
        tenantId,
        type: 'recurring_cancelled' as never,
        title: 'Recurring Cancelled',
        message: 'Client cancelled recurring schedule via SMS',
      }).catch(() => {})
      return JSON.stringify({ success: true, message: 'Recurring schedule cancelled' })
    }
    return JSON.stringify({ error: `Unknown action: ${action}` })
  } catch (err) {
    await selenaErr(tenantId, 'manage_recurring', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

export async function handleReportIssue(tenantId: string, input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const description = input.description as string
    const severity = (input.severity as string) || 'medium'
    const { data: convo } = await supabaseAdmin
      .from('sms_conversations').select('client_id, name, phone').eq('id', conversationId).single()

    await supabaseAdmin.from('selena_memory').insert({
      tenant_id: tenantId, client_id: convo?.client_id || null,
      type: 'issue', content: description, source: 'selena',
    })

    await supabaseAdmin.from('admin_tasks').insert({
      tenant_id: tenantId, type: 'client_issue', priority: severity,
      title: `Issue — ${convo?.name || convo?.phone || 'Client'}`,
      description, related_type: 'client', related_id: convo?.client_id || null,
    })

    await notify({
      tenantId,
      type: 'client_issue' as never,
      title: `Issue — ${convo?.name || convo?.phone || 'Client'} (${severity})`,
      message: `${convo?.name || 'Client'} reported: ${description}`,
    }).catch(() => {})

    return JSON.stringify({ success: true, message: 'Issue logged and team notified' })
  } catch (err) {
    await selenaErr(tenantId, 'report_issue', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

export async function handleRequestCallback(tenantId: string, input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const reason = (input.reason as string) || 'Client requested callback'
    const { data: convo } = await supabaseAdmin
      .from('sms_conversations').select('client_id, name, phone').eq('id', conversationId).single()

    const { data: msgs } = await supabaseAdmin
      .from('sms_conversation_messages')
      .select('direction, message').eq('conversation_id', conversationId)
      .order('created_at', { ascending: false }).limit(10)
    const context = (msgs || []).reverse()
      .map(m => `${m.direction === 'inbound' ? 'Client' : 'Selena'}: ${m.message}`).join('\n')

    await supabaseAdmin.from('admin_tasks').insert({
      tenant_id: tenantId, type: 'callback_requested', priority: 'high',
      title: `Callback — ${convo?.name || convo?.phone || 'Client'}`,
      description: `Reason: ${reason}\n\nContext:\n${context}`,
      related_type: 'client', related_id: convo?.client_id || null,
    })

    await notify({
      tenantId,
      type: 'callback_requested' as never,
      title: `Callback — ${convo?.name || convo?.phone || 'Client'}`,
      message: `${convo?.name || 'Client'} wants a callback. Phone: ${convo?.phone}\nReason: ${reason}\n\nContext:\n${context}`,
    }).catch(() => {})

    return JSON.stringify({ success: true, message: 'Team notified — they will call within 15 minutes' })
  } catch (err) {
    await selenaErr(tenantId, 'request_callback', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

export async function handleBookingDetails(tenantId: string, input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const clientId = await getConvoClientId(conversationId)
    if (!clientId) return JSON.stringify({ error: 'No account found' })

    let bookingId = input.booking_id as string | undefined
    if (!bookingId) {
      const { data: recent } = await supabaseAdmin
        .from('bookings').select('id')
        .eq('tenant_id', tenantId).eq('client_id', clientId)
        .in('status', ['completed', 'in_progress'])
        .order('start_time', { ascending: false }).limit(1).single()
      bookingId = recent?.id
    }
    if (!bookingId) {
      const { data: any } = await supabaseAdmin
        .from('bookings').select('id')
        .eq('tenant_id', tenantId).eq('client_id', clientId)
        .order('start_time', { ascending: false }).limit(1).single()
      bookingId = any?.id
    }
    if (!bookingId) return JSON.stringify({ error: 'No bookings found for this client' })

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, end_time, check_in_time, check_out_time, check_in_location, check_out_location, check_in_lat, check_in_lng, check_out_lat, check_out_lng, actual_hours, hourly_rate, price, team_member_pay, payment_status, payment_method, status, service_type, team_members(name), clients(name, address)')
      .eq('id', bookingId).eq('tenant_id', tenantId).single()
    if (!booking) return JSON.stringify({ error: 'Booking not found' })

    const client = booking.clients as unknown as { name: string; address: string } | null
    const tm = booking.team_members as unknown as { name: string } | null

    const checkInTime = fmtTime(booking.check_in_time)
    const checkOutTime = fmtTime(booking.check_out_time)

    let calculatedHours: number | null = null
    let rawMinutes: number | null = null
    if (booking.check_in_time && booking.check_out_time) {
      const diffMs = new Date(booking.check_out_time).getTime() - new Date(booking.check_in_time).getTime()
      rawMinutes = Math.round(diffMs / (1000 * 60))
      const fullHalf = Math.floor(rawMinutes / 30)
      const remainder = rawMinutes % 30
      calculatedHours = remainder > 10 ? (fullHalf + 1) * 0.5 : fullHalf * 0.5
    }

    const hours = booking.actual_hours || calculatedHours || null
    const rate = booking.hourly_rate || 0
    const total = hours ? Math.round(hours * rate) : null

    const formatLoc = (loc: unknown, lat: number | null, lng: number | null): string => {
      if (loc && typeof loc === 'object') {
        const l = loc as { latitude?: number; longitude?: number; address?: string }
        if (l.address) return l.address
        if (l.latitude && l.longitude) return `GPS: ${Number(l.latitude).toFixed(6)}, ${Number(l.longitude).toFixed(6)}`
      }
      if (lat && lng) return `GPS: ${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
      return 'not recorded'
    }

    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount_cents, tip_cents, method, created_at')
      .eq('tenant_id', tenantId).eq('booking_id', bookingId)
      .order('created_at', { ascending: false }).limit(3)

    return JSON.stringify({
      booking_id: bookingId,
      date: booking.start_time?.split('T')[0],
      scheduled_time: fmtTime(booking.start_time),
      service_type: booking.service_type,
      status: booking.status,
      team_member: tm?.name || 'unassigned',
      client_address: client?.address || 'not on file',
      check_in: { time: checkInTime, location: formatLoc(booking.check_in_location, booking.check_in_lat, booking.check_in_lng), raw: booking.check_in_time },
      check_out: { time: checkOutTime, location: formatLoc(booking.check_out_location, booking.check_out_lat, booking.check_out_lng), raw: booking.check_out_time },
      hours: {
        raw_minutes: rawMinutes, billed_hours: hours, calculated_hours: calculatedHours,
        rounding_rule: 'After 10 minutes past a 30-min mark, rounds up to the next 30 minutes',
        explanation: rawMinutes
          ? `${rawMinutes} minutes total. ${rawMinutes % 30 > 10 ? `${rawMinutes % 30} min past the half hour → rounded up to ${hours} hours` : `${rawMinutes % 30} min into the half hour → stays at ${hours} hours`}`
          : null,
      },
      rate_per_hour: rate,
      total: total ? `$${total}` : 'not calculated',
      math: hours ? `${hours} hours × $${rate}/hr = $${total}` : 'check-in/out times needed for calculation',
      payment: {
        status: booking.payment_status, method: booking.payment_method,
        records: (payments || []).map(p => ({
          amount: `$${((p.amount_cents || 0) / 100).toFixed(2)}`,
          tip: p.tip_cents ? `$${(p.tip_cents / 100).toFixed(2)}` : null,
          method: p.method, date: p.created_at?.split('T')[0],
        })),
      },
    })
  } catch (err) {
    await selenaErr(tenantId, 'booking_details', err, conversationId)
    return JSON.stringify({ error: 'Failed to load booking details' })
  }
}

export async function handleRemember(tenantId: string, input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const clientId = await getConvoClientId(conversationId)
    await supabaseAdmin.from('selena_memory').insert({
      tenant_id: tenantId,
      client_id: clientId,
      type: (input.type as string) || 'observation',
      content: input.content as string,
      source: 'selena',
    })
    return JSON.stringify({ success: true })
  } catch (err) {
    await selenaErr(tenantId, 'remember', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

// ─── Router ─────────────────────────────────────────────────────────────────

export async function routeExtendedTool(
  toolName: string,
  tenantId: string,
  input: Record<string, unknown>,
  conversationId: string
): Promise<string | null> {
  switch (toolName) {
    case 'get_account': return handleGetAccount(tenantId, conversationId)
    case 'update_account': return handleUpdateAccount(tenantId, input, conversationId)
    case 'send_pin': return handleSendPin(tenantId, conversationId)
    case 'resend_confirmation': return handleResendConfirmation(tenantId, input, conversationId)
    case 'check_payment': return handleCheckPayment(tenantId, conversationId)
    case 'confirm_payment': return handleConfirmPayment(tenantId, input, conversationId)
    case 'get_invoice': return handleGetInvoice(tenantId, input, conversationId)
    case 'lookup_bookings': return handleLookupBookings(tenantId, input, conversationId)
    case 'reschedule_booking': return handleRescheduleBooking(tenantId, input, conversationId)
    case 'cancel_booking': return handleCancelBooking(tenantId, input, conversationId)
    case 'manage_recurring': return handleManageRecurring(tenantId, input, conversationId)
    case 'booking_details': return handleBookingDetails(tenantId, input, conversationId)
    case 'report_issue': return handleReportIssue(tenantId, input, conversationId)
    case 'request_callback': return handleRequestCallback(tenantId, input, conversationId)
    case 'remember': return handleRemember(tenantId, input, conversationId)
    default: return null
  }
}
