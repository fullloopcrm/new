import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { sendSMS } from '@/lib/sms'
import { smsUrgentBroadcast } from '@/lib/sms-templates'
import { notify } from '@/lib/notify'

// POST - Broadcast urgent job to all active team members
export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.create')
  if (authError) return authError

  const { tenantId } = tenant
  const body = await request.json()
  const { booking_id } = body

  if (!booking_id) {
    return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })
  }

  const db = tenantDb(tenantId)

  // Get tenant config
  const { data: tenantConfig } = await supabaseAdmin
    .from('tenants')
    .select('name, telnyx_api_key, telnyx_phone, resend_api_key, primary_color')
    .eq('id', tenantId)
    .single()

  if (!tenantConfig) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // Get the booking
  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data: booking } = (await db
    .from('bookings')
    .select('*, clients(name, address)')
    .eq('id', booking_id)
    .single()) as {
      data: {
        start_time: string
        end_time: string | null
        pay_rate: number | null
        service_type: string | null
        notes: string | null
        clients: unknown
      } | null
    }

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Get all active team members
  const { data: members } = (await db
    .from('team_members')
    .select('id, name, phone, email, sms_consent')
    .eq('status', 'active')) as {
      data: { id: string; name: string; phone: string | null; email: string | null; sms_consent: boolean | null }[] | null
    }

  if (!members || members.length === 0) {
    return NextResponse.json({ error: 'No active team members' }, { status: 400 })
  }

  // Check if at least one notification channel is configured
  const hasEmail = !!(tenantConfig.resend_api_key || (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'placeholder'))
  const hasSMS = !!(tenantConfig.telnyx_api_key && tenantConfig.telnyx_phone)

  if (!hasEmail && !hasSMS) {
    return NextResponse.json({ error: 'No notification channels configured. Add Resend or Telnyx keys in Settings.' }, { status: 400 })
  }

  const jobDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const jobTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const endTime = booking.end_time ? new Date(booking.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''
  const payRate = booking.pay_rate || 40
  const client = booking.clients as unknown as { name: string; address: string } | null

  const reports: { name: string; sms: boolean; email: boolean; push: boolean }[] = []

  for (const member of members) {
    let smsSent = false
    let emailSent = false
    let pushSent = false

    // SMS broadcast
    if (member.phone && member.sms_consent !== false && tenantConfig.telnyx_api_key && tenantConfig.telnyx_phone) {
      const smsBody = smsUrgentBroadcast(tenantConfig.name, { start_time: booking.start_time, team_pay_rate: payRate })
      try {
        await sendSMS({ to: member.phone, body: smsBody, telnyxApiKey: tenantConfig.telnyx_api_key, telnyxPhone: tenantConfig.telnyx_phone })
        smsSent = true
      } catch { /* skip */ }
    }

    // Email broadcast
    if (member.email) {
      try {
        await notify({
          tenantId,
          type: 'job_broadcast',
          title: `Urgent: $${payRate}/hr Job Available`,
          message: `Urgent job available ${jobDate} ${jobTime}${endTime ? ` - ${endTime}` : ''} at $${payRate}/hr. First to claim gets it — log in to your team portal to claim.`,
          channel: 'email',
          recipientType: 'team_member',
          recipientId: member.id,
          bookingId: booking_id,
          metadata: {
            payRate,
            jobDate,
            jobTime,
            endTime: endTime || undefined,
            address: client?.address,
            serviceType: booking.service_type || undefined,
            notes: booking.notes || undefined,
          },
        })
        emailSent = true
      } catch { /* skip */ }
    }

    // Push broadcast — gracefully no-ops (no throw) when the recipient has
    // no push subscription on file, same convention as the sms/email legs above.
    try {
      const result = await notify({
        tenantId,
        type: 'job_broadcast',
        title: `Urgent: $${payRate}/hr Job Available`,
        message: `Urgent job available ${jobDate} ${jobTime}${endTime ? ` - ${endTime}` : ''} at $${payRate}/hr. First to claim gets it — log in to your team portal to claim.`,
        channel: 'push',
        recipientType: 'team_member',
        recipientId: member.id,
        bookingId: booking_id,
      })
      pushSent = result.success === true
    } catch { /* skip */ }

    reports.push({ name: member.name, sms: smsSent, email: emailSent, push: pushSent })
  }

  const sentCount = reports.filter(r => r.sms || r.email || r.push).length

  // Admin notification with delivery summary
  const summary = reports.map(r => `${r.name}: sms ${r.sms ? '✓' : '✗'} email ${r.email ? '✓' : '✗'} push ${r.push ? '✓' : '✗'}`).join(', ')
  await db.from('notifications').insert({
    type: 'job_broadcast',
    title: 'Job Broadcast Sent',
    message: `Sent to ${sentCount}/${members.length} team members. ${summary}`,
    booking_id: booking_id,
    channel: 'in_app',
    status: 'sent',
  })

  return NextResponse.json({ success: true, sentTo: sentCount, reports })
}
