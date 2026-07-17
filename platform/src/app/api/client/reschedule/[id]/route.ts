import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'
import { notify } from '@/lib/notify'
import { notifyTeamMember } from '@/lib/notify-team-member'
import { smsJobRescheduled } from '@/lib/sms-templates'
import { clientSmsTemplates } from '@/lib/messaging/client-sms'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { protectClientAPI } from '@/lib/client-auth'
import { getTerminatedTeamMemberIds } from '@/lib/hr'

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

  const { data: oldBooking } = await supabaseAdmin
    .from('bookings')
    .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()
  if (!oldBooking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const auth = await protectClientAPI(tenant.id, oldBooking.client_id)
  if (auth instanceof NextResponse) return auth

  // A caller-supplied team_member_id must belong to THIS tenant — team_members
  // has no cross-tenant FK check, so without this an authenticated client
  // could reassign their own booking to another tenant's employee (same IDOR
  // class as client/recurring's cleaner_id/property_id gaps).
  if (body.team_member_id) {
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('id', body.team_member_id)
      .eq('tenant_id', tenant.id)
      .maybeSingle()
    if (!member) return NextResponse.json({ error: 'Invalid team member' }, { status: 400 })

    // HR termination never touches team_members.status/active (deliberate —
    // see hr.ts's own doc comment), so tenant-ownership alone isn't enough: a
    // client rescheduling their own booking could reassign it straight to a
    // fired employee. This raw supabaseAdmin update also bypasses PUT
    // /api/bookings/[id]'s own terminated-crew guard entirely, since that
    // guard only runs on that specific route, not this one.
    const [terminatedId] = await getTerminatedTeamMemberIds(tenant.id, [body.team_member_id])
    if (terminatedId) {
      return NextResponse.json({ error: 'Invalid team member' }, { status: 400 })
    }
  }

  const tz = tenant.timezone || 'America/New_York'
  const oldDate = fmtDate(oldBooking.start_time, tz)
  const oldTime = fmtTime(oldBooking.start_time, tz)

  const { data: updated, error } = await supabaseAdmin
    .from('bookings')
    .update({
      start_time: body.start_time,
      end_time: body.end_time,
      ...(body.team_member_id !== undefined ? { team_member_id: body.team_member_id } : {}),
    })
    .eq('id', id)
    .eq('tenant_id', tenant.id)
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
      await supabaseAdmin.from('email_logs').insert({
        tenant_id: tenant.id,
        booking_id: id,
        email_type: 'client_reschedule',
        recipient: updated.clients.email,
      }).then(() => {}, () => {})
    }

    // 2. Client SMS — sms_consent, same invariant every other client SMS
    // fan-out enforces (payment-processor.ts, webhooks/stripe.ts,
    // client/book route.ts). do_not_service is already covered upstream:
    // protectClientAPI blocks a do_not_service client's session entirely, so
    // this route never reaches here for one — but sms_consent=false (STOP)
    // is a separate, still-authenticated axis that was never checked.
    if (updated.clients?.phone && updated.clients?.sms_consent !== false && tenant.telnyx_api_key && tenant.telnyx_phone) {
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

    // 4. Team member (if assigned) — the assignment itself may predate this
    // request entirely (client only moved the date/time, didn't touch
    // team_member_id): a booking can already be stale-assigned to a
    // terminated worker (same root cause as the cron stale-assignment guards
    // — HR termination never clears bookings.team_member_id), and without
    // this check a client-initiated reschedule would still text/email/push
    // "Job Rescheduled" to someone who no longer works here. The
    // caller-supplied-id check above only covers a NEW assignment in this
    // same request; this covers the pre-existing one.
    const [staleTerminatedId] = updated.team_member_id
      ? await getTerminatedTeamMemberIds(tenant.id, [updated.team_member_id])
      : []
    if (updated.team_member_id && !staleTerminatedId) {
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
