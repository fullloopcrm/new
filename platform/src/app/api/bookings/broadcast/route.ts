import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
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
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*, clients(name, address)')
    .eq('id', booking_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Get all active team members
  const { data: members } = await supabaseAdmin
    .from('team_members')
    .select('id, name, phone, email')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!members || members.length === 0) {
    return NextResponse.json({ error: 'No active team members' }, { status: 400 })
  }

  const jobDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const jobTime = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const endTime = booking.end_time ? new Date(booking.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''
  const payRate = booking.pay_rate || 40
  const client = booking.clients as unknown as { name: string; address: string } | null

  const reports: { name: string; sms: boolean; email: boolean }[] = []

  for (const member of members) {
    let smsSent = false
    let emailSent = false

    // SMS broadcast
    if (member.phone && tenantConfig.telnyx_api_key && tenantConfig.telnyx_phone) {
      const smsBody = smsUrgentBroadcast(tenantConfig.name, { start_time: booking.start_time, team_pay_rate: payRate })
      try {
        await sendSMS({ to: member.phone, body: smsBody, telnyxApiKey: tenantConfig.telnyx_api_key, telnyxPhone: tenantConfig.telnyx_phone })
        smsSent = true
      } catch { /* skip */ }
    }

    // Email broadcast
    if (member.email) {
      const color = tenantConfig.primary_color || '#dc2626'
      const broadcastHtml = `
        <div style="font-family: sans-serif; max-width: 500px;">
          <div style="background: ${color}; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">URGENT JOB AVAILABLE</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">First to claim gets it!</p>
          </div>
          <div style="background: #fef2f2; padding: 20px; border: 2px solid #fecaca;">
            <p style="font-size: 28px; font-weight: bold; color: #16a34a; margin: 0 0 10px 0;">$${payRate}/hr</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${jobDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${jobTime}${endTime ? ` - ${endTime}` : ''}</p>
            <p style="margin: 5px 0;"><strong>Location:</strong> ${client?.address || 'TBD'}</p>
            ${booking.service_type ? `<p style="margin: 5px 0;"><strong>Service:</strong> ${booking.service_type}</p>` : ''}
            ${booking.notes ? `<p style="margin: 10px 0; padding: 10px; background: #fef9c3; border-radius: 6px;"><strong>Notes:</strong> ${booking.notes}</p>` : ''}
          </div>
          <div style="padding: 20px; text-align: center;">
            <p style="color: #666; font-size: 14px;">Log in to your team portal to claim this job.</p>
          </div>
        </div>
      `

      try {
        await notify({
          tenantId,
          type: 'booking_reminder',
          title: `Urgent: $${payRate}/hr Job Available`,
          message: broadcastHtml,
          channel: 'email',
          recipientType: 'team_member',
          recipientId: member.id,
          bookingId: booking_id,
        })
        emailSent = true
      } catch { /* skip */ }
    }

    reports.push({ name: member.name, sms: smsSent, email: emailSent })
  }

  const sentCount = reports.filter(r => r.sms || r.email).length

  // Admin notification with delivery summary
  const summary = reports.map(r => `${r.name}: sms ${r.sms ? '✓' : '✗'} email ${r.email ? '✓' : '✗'}`).join(', ')
  await supabaseAdmin.from('notifications').insert({
    tenant_id: tenantId,
    type: 'job_broadcast',
    title: 'Job Broadcast Sent',
    message: `Sent to ${sentCount}/${members.length} team members. ${summary}`,
    booking_id: booking_id,
    channel: 'in_app',
    status: 'sent',
  })

  return NextResponse.json({ success: true, sentTo: sentCount, reports })
}
