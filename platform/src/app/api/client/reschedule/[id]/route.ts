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

  // A client picking who does their job must stay inside their own tenant's
  // active roster — same gate /api/client/preferred-cleaner already enforces.
  // Without this, team_member_id was written straight from client input with
  // no ownership check, letting a client point their booking's assignee FK at
  // any team_members row (including another tenant's), which then leaks that
  // employee's name/rate into this tenant's booking joins.
  if (body.team_member_id) {
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('id, active')
      .eq('id', body.team_member_id)
      .eq('tenant_id', tenant.id)
      .single()
    if (!member || member.active === false) {
      return NextResponse.json({ error: 'Cleaner not available' }, { status: 400 })
    }
  }

  const tz = tenant.timezone || 'America/New_York'
  const oldDate = fmtDate(oldBooking.start_time, tz)
  const oldTime = fmtTime(oldBooking.start_time, tz)

  // Check-then-act, not atomic: `oldBooking` above is a stale snapshot -- an
  // admin/cleaner can move this booking to a terminal state (checked in,
  // completed, cancelled) between that read and this write. Without
  // re-asserting the pre-read status in THIS update's own WHERE, a client's
  // in-flight reschedule would silently clobber whatever just happened (e.g.
  // moving the start_time on a job a cleaner just checked into). Same fix
  // already applied to the sibling PUT /api/portal/bookings/[id].
  const { data: updated, error } = await supabaseAdmin
    .from('bookings')
    .update({
      start_time: body.start_time,
      end_time: body.end_time,
      ...(body.team_member_id !== undefined ? { team_member_id: body.team_member_id } : {}),
    })
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .eq('status', oldBooking.status)
    .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated) {
    return NextResponse.json(
      { error: 'This booking changed status concurrently — refresh instead of editing' },
      { status: 409 },
    )
  }

  // GET /api/bookings/:id/team and closeout-summary source the lead from
  // booking_team_members, not bookings.team_member_id -- a client-initiated
  // reassign here updated the latter but left the stale (or missing) lead
  // row behind. Same booking_team_members-sync gap fixed at every other
  // bookings.team_member_id write site this session.
  if (body.team_member_id !== undefined) {
    await supabaseAdmin.from('booking_team_members').delete().eq('booking_id', id).eq('is_lead', true)
    if (body.team_member_id) {
      await supabaseAdmin.from('booking_team_members').upsert(
        { tenant_id: tenant.id, booking_id: id, team_member_id: body.team_member_id, is_lead: true, position: 1 },
        { onConflict: 'booking_id,team_member_id' }
      )
    }
  }

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
