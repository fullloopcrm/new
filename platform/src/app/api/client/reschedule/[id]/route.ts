import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'
import { notify } from '@/lib/notify'
import { notifyTeamMember } from '@/lib/notify-team-member'
import { smsJobRescheduled } from '@/lib/sms-templates'
import { clientSmsTemplates } from '@/lib/messaging/client-sms'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { protectClientAPI } from '@/lib/client-auth'
import { rateLimitDb } from '@/lib/rate-limit-db'

function fmtDate(iso: string, tz: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: tz, weekday: 'long', month: 'long', day: 'numeric',
  })
}
function fmtTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit',
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const { id } = await params
  const body = await request.json().catch(() => ({})) as {
    start_time?: string
    end_time?: string
    team_member_id?: string | null
  }

  const { data: oldBooking } = await tenantDb(tenant.id)
    .from('bookings')
    .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
    .eq('id', id)
    .single()
  if (!oldBooking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const auth = await protectClientAPI(tenant.id, oldBooking.client_id)
  if (auth instanceof NextResponse) return auth

  // Every reschedule fires a real client SMS, an admin notification, and a
  // team-member SMS with no other cap -- without this, looping the endpoint
  // is unmetered SMS/email-cost-abuse against real phone numbers/inboxes.
  const rl = await rateLimitDb(`client-reschedule:${auth.clientId}`, 10, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  // Confirm a caller-supplied team_member_id belongs to this tenant --
  // otherwise a foreign id gets its full row (name/phone/pay_rate) pulled
  // into the response via the team_members!bookings_team_member_id_fkey
  // join below, a cross-tenant PII leak to an external customer (same class
  // already fixed on staff-facing bookings/schedules routes).
  if (body.team_member_id) {
    const { data: memberRow } = await tenantDb(tenant.id)
      .from('team_members').select('id').eq('id', body.team_member_id).single()
    if (!memberRow) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
  }

  const tz = tenant.timezone || 'America/New_York'
  const oldDate = fmtDate(oldBooking.start_time, tz)
  const oldTime = fmtTime(oldBooking.start_time, tz)

  const { data: updated, error } = await tenantDb(tenant.id)
    .from('bookings')
    .update({
      start_time: body.start_time,
      end_time: body.end_time,
      ...(body.team_member_id !== undefined ? { team_member_id: body.team_member_id } : {}),
    })
    .eq('id', id)
    .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
    .single()
  if (error || !updated) return NextResponse.json({ error: error?.message || 'Update failed' }, { status: 500 })

  // Async fan-out — never block the response on notification failures.
  void (async () => {
    const newDate = body.start_time ? fmtDate(body.start_time, tz) : ''
    const newTime = body.start_time ? fmtTime(body.start_time, tz) : ''

    // 1. Client confirmation email
    if (updated.clients?.email && tenant.resend_api_key) {
      const html = `<div style="font-family:system-ui;-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <h2>Your booking has been rescheduled</h2>
        <p><strong>${tenant.name}</strong> moved your appointment.</p>
        <p><strong>From:</strong> ${oldDate} at ${oldTime}<br/><strong>To:</strong> ${newDate} at ${newTime}</p>
      </div>`
      await sendEmail({
        to: updated.clients.email,
        subject: `Booking rescheduled — ${tenant.name}`,
        html,
        resendApiKey: tenant.resend_api_key,
        from: tenant.email_from || undefined,
      }).catch(() => {})
      await tenantDb(tenant.id).from('email_logs').insert({
        booking_id: id,
        email_type: 'client_reschedule',
        recipient: updated.clients.email,
      }).then(() => {}, () => {})
    }

    // 2. Client SMS
    if (updated.clients?.phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
      await sendSMS({
        to: updated.clients.phone,
        body: clientSmsTemplates(tenant).reschedule(updated),
        telnyxApiKey: tenant.telnyx_api_key,
        telnyxPhone: tenant.telnyx_phone,
      }).catch(() => {})
    }

    // 3. Admin notification
    await notify({
      tenantId: tenant.id,
      type: 'lifecycle_change',
      title: 'Booking Rescheduled',
      message: `${updated.clients?.name || 'Client'} moved from ${oldDate} ${oldTime} to ${newDate} ${newTime}`,
      booking_id: id,
    }).catch(() => {})

    // 4. Team member (if assigned)
    if (updated.team_member_id) {
      await notifyTeamMember({
        tenantId: tenant.id,
        teamMemberId: updated.team_member_id,
        type: 'job_rescheduled',
        title: 'Job Rescheduled',
        message: `${updated.clients?.name || 'Client'} moved to ${newDate}`,
        bookingId: id,
        smsMessage: smsJobRescheduled(tenant.name, updated),
      }).catch(() => {})
    }
  })()

  return NextResponse.json(updated)
}
