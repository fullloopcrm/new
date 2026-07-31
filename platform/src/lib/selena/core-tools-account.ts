import { randomInt } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/nycmaid/notify'
import { sendEmail } from '@/lib/nycmaid/email'
import { emailWrapper } from '@/lib/nycmaid/email-templates'
import { sendSMS, yinezError, NYCMAID_TENANT_ID } from './core-types'
import { encryptSecretSafe, decryptSecret } from '@/lib/secret-crypto'

export async function handleGetAccount(conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account found' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    const { data: client } = await supabaseAdmin.from('clients').select('name, email, phone, address, pin, created_at').eq('id', convo.client_id).eq('tenant_id', tid).single()
    const { data: upcoming } = await supabaseAdmin.from('bookings')
      .select('id, start_time, status, service_type, hourly_rate, payment_status, team_members(name)')
      .eq('tenant_id', tid).eq('client_id', convo.client_id).in('status', ['pending', 'scheduled', 'confirmed', 'in_progress'])
      .gte('start_time', new Date().toISOString()).order('start_time').limit(5)
    const { data: payments } = await supabaseAdmin.from('payments')
      .select('amount, tip, method, created_at').eq('tenant_id', tid).eq('client_id', convo.client_id)
      .order('created_at', { ascending: false }).limit(5)
    const { data: memories } = await supabaseAdmin.from('yinez_memory')
      .select('type, content').eq('tenant_id', tid).eq('client_id', convo.client_id).limit(10)
    const { data: recurring } = await supabaseAdmin.from('recurring_schedules')
      .select('id, recurring_type, day_of_week, preferred_time, status, team_members(name)')
      .eq('tenant_id', tid).eq('client_id', convo.client_id).eq('status', 'active')

    return JSON.stringify({
      client: { name: client?.name, email: client?.email, phone: client?.phone, address: client?.address, member_since: client?.created_at?.split('T')[0] },
      upcoming: (upcoming || []).map(b => ({
        id: b.id, date: b.start_time?.split('T')[0],
        time: b.start_time ? new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }) : null,
        status: b.status, service: b.service_type, rate: b.hourly_rate,
        payment: b.payment_status, cleaner: (b.team_members as unknown as { name: string })?.name || 'TBD',
      })),
      recent_payments: (payments || []).map(p => ({ amount: `$${(p.amount / 100).toFixed(0)}`, tip: p.tip ? `$${(p.tip / 100).toFixed(0)}` : null, method: p.method, date: p.created_at?.split('T')[0] })),
      recurring: (recurring || []).map(r => ({ id: r.id, type: r.recurring_type, day: r.day_of_week, time: r.preferred_time, cleaner: (r.team_members as unknown as { name: string })?.name || 'TBD' })),
      preferences: (memories || []).map(m => m.content),
    })
  } catch (err) {
    await yinezError('get_account', err, conversationId)
    return JSON.stringify({ error: 'Failed to load account' })
  }
}

export async function handleUpdateAccount(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account found' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID
    const field = input.field as string
    const value = input.value as string
    const allowed = ['address', 'email', 'phone', 'name']
    if (!allowed.includes(field)) return JSON.stringify({ error: `Cannot update ${field}` })
    // Address changes ADD a property (set primary) — never overwrite the old one,
    // so history is preserved and other properties aren't clobbered.
    if (field === 'address') {
      const { addProperty } = await import('@/lib/client-properties')
      const prop = await addProperty(convo.client_id, value, { makePrimary: true, actor: { changedBy: 'agent', actorId: 'yinez', source: 'api' } })
      if (!prop) return JSON.stringify({ error: 'Failed to add address' })
      return JSON.stringify({ success: true, message: `Address added and set as primary: ${value}` })
    }
    const { error: updateAccountError } = await supabaseAdmin.from('clients').update({ [field]: value }).eq('id', convo.client_id).eq('tenant_id', tid)
    if (updateAccountError) {
      await yinezError('update_account', updateAccountError, conversationId)
      return JSON.stringify({ error: 'Failed to update' })
    }
    return JSON.stringify({ success: true, message: `${field} updated to ${value}` })
  } catch (err) {
    await yinezError('update_account', err, conversationId)
    return JSON.stringify({ error: 'Failed to update' })
  }
}

export async function handleSendPin(conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, phone, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account found' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID
    const { data: client } = await supabaseAdmin.from('clients').select('id, pin, name, phone').eq('id', convo.client_id).eq('tenant_id', tid).single()
    if (!client) return JSON.stringify({ error: 'Client not found' })

    // Validate PIN is 6 digits — regenerate if not
    let pin = client.pin ? decryptSecret(client.pin) : null
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      pin = randomInt(100000, 1000000).toString()
      await supabaseAdmin.from('clients').update({ pin: encryptSecretSafe(pin) }).eq('id', client.id).eq('tenant_id', tid)
    }

    const phone = client.phone || convo.phone
    if (phone) {
      await sendSMS(tid, phone, `Hi ${client.name || 'there'}! Your portal PIN is: ${pin}\n\nLog in at thenycmaid.com/portal 😊`)
    }
    return JSON.stringify({ success: true, message: `PIN sent to ${phone}` })
  } catch (err) {
    await yinezError('send_pin', err, conversationId)
    return JSON.stringify({ error: 'Failed to send PIN' })
  }
}

export async function handleResendConfirmation(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account found' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    let bookingId = input.booking_id as string | undefined
    if (!bookingId) {
      const { data: next } = await supabaseAdmin.from('bookings')
        .select('id').eq('tenant_id', tid).eq('client_id', convo.client_id)
        .in('status', ['pending', 'scheduled']).gte('start_time', new Date().toISOString())
        .order('start_time').limit(1).single()
      bookingId = next?.id
    }
    if (!bookingId) return JSON.stringify({ error: 'No upcoming booking found' })

    const { data: booking } = await supabaseAdmin.from('bookings')
      .select('client_id, start_time, service_type, hourly_rate, clients(name, email, pin), team_members(name)')
      .eq('id', bookingId).eq('tenant_id', tid).single()
    if (!booking) return JSON.stringify({ error: 'Booking not found' })
    // Client-ownership: booking_id is caller-supplied. A same-tenant fetch alone lets a
    // client read/resend another client's confirmation; require the booking to be the caller's.
    if (booking.client_id !== convo.client_id) return JSON.stringify({ error: 'not_your_booking', message: 'That booking is not on your account.' })

    const client = booking.clients as unknown as { name: string; email: string; pin: string }
    if (!client?.email) return JSON.stringify({ error: 'No email on file' })
    const plainPin = client.pin ? decryptSecret(client.pin) : null

    const cleaner = booking.team_members as unknown as { name: string }
    const date = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' })
    const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })

    const html = emailWrapper(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1a1a1a">Booking Confirmation</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#333">Hi ${client.name}! Your cleaning is confirmed:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;background:#f9fafb;border-radius:8px">
        <tr><td style="padding:16px">
          <p style="margin:0 0 8px;font-size:14px;color:#666">Date: <strong>${date}</strong></p>
          <p style="margin:0 0 8px;font-size:14px;color:#666">Time: <strong>${time}</strong></p>
          <p style="margin:0 0 8px;font-size:14px;color:#666">Service: <strong>${booking.service_type}</strong></p>
          <p style="margin:0 0 8px;font-size:14px;color:#666">Rate: <strong>$${booking.hourly_rate}/hr</strong></p>
          ${cleaner ? `<p style="margin:0 0 8px;font-size:14px;color:#666">Cleaner: <strong>${cleaner.name}</strong></p>` : ''}
          ${plainPin ? `<p style="margin:0;font-size:14px;color:#666">Portal PIN: <strong>${plainPin}</strong></p>` : ''}
        </td></tr>
      </table>
    `)

    await sendEmail(client.email, `Booking Confirmed — ${date} — The NYC Maid`, html)
    return JSON.stringify({ success: true, message: `Confirmation resent to ${client.email}` })
  } catch (err) {
    await yinezError('resend_confirmation', err, conversationId)
    return JSON.stringify({ error: 'Failed to resend' })
  }
}

export async function handleCheckPayment(conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID
    const { data: unpaid } = await supabaseAdmin.from('bookings')
      .select('id, start_time, price, hourly_rate, actual_hours, payment_status, service_type')
      .eq('tenant_id', tid).eq('client_id', convo.client_id).in('status', ['completed', 'checked_in', 'in_progress', 'scheduled'])
      .neq('payment_status', 'paid').order('start_time', { ascending: false }).limit(5)
    const { data: payments } = await supabaseAdmin.from('payments')
      .select('amount, tip, method, created_at').eq('tenant_id', tid).eq('client_id', convo.client_id)
      .order('created_at', { ascending: false }).limit(5)
    return JSON.stringify({
      outstanding: (unpaid || []).map(b => ({ date: b.start_time?.split('T')[0], amount: b.price ? `$${(b.price / 100).toFixed(0)}` : 'TBD', status: b.payment_status })),
      recent_payments: (payments || []).map(p => ({ amount: `$${(p.amount / 100).toFixed(0)}`, tip: p.tip ? `$${(p.tip / 100).toFixed(0)}` : null, method: p.method, date: p.created_at?.split('T')[0] })),
    })
  } catch (err) {
    await yinezError('check_payment', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

export async function handleConfirmPayment(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const method = (input.method as string) || 'zelle'
    const senderName = (input.sender_name as string)?.trim() || null
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    const { data: booking } = await supabaseAdmin.from('bookings')
      .select('id, team_member_id, start_time, clients(name), team_members(name, phone, sms_consent)')
      .eq('tenant_id', tid).eq('client_id', convo.client_id)
      .neq('payment_status', 'paid').not('fifteen_min_alert_time', 'is', null)
      .order('start_time', { ascending: false }).limit(1).single()

    // Mark the booking as "client-claimed". payment_method here is provisional —
    // processPayment overwrites it with the verified method on email/Stripe match.
    // Crons check payment_method to know whether the client has already claimed
    // (so we don't nudge them after they've replied "paid").
    if (booking) {
      const updates: Record<string, unknown> = { payment_method: method }
      if (senderName) updates.payment_sender_name = senderName
      await supabaseAdmin.from('bookings').update(updates).eq('id', booking.id).eq('tenant_id', tid)
    }

    // Trigger immediate email monitor (Zelle/Venmo verification path).
    // Public domain only — Vercel deployment URLs are 401'd by deployment protection.
    const monitorKey = process.env.ELCHAPO_MONITOR_KEY?.replace(/\\n/g, '')
    if (monitorKey) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://www.thenycmaid.com'
      fetch(`${baseUrl}/api/email/monitor`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: monitorKey }) }).catch(() => {})
    }

    if (booking) {
      const clientName = (booking.clients as unknown as { name: string })?.name || 'Client'
      const senderLine = senderName ? ` Payer: ${senderName}.` : ''

      // Do NOT fire cleaner SMS here — that fires only after the actual money is
      // verified (email match in payment-processor.ts, or Stripe webhook).
      // We only acknowledge the client claim + tell admin we're verifying.
      const verifyVia = method === 'card' || method === 'stripe' ? 'Stripe webhook' : 'email monitor'
      await notify({ type: 'payment_claimed', title: `${clientName} says paid (${method})`, message: `${clientName} claims ${method} payment.${senderLine} Verifying via ${verifyVia} — cleaner NOT released yet.`, booking_id: booking.id }).catch(() => {})
    }
    return JSON.stringify({ success: true, method, sender_name: senderName })
  } catch (err) {
    await yinezError('confirm_payment', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

