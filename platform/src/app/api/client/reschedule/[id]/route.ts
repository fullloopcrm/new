import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { sendSMS } from '@/lib/sms'
import { notify } from '@/lib/notify'
import { isCommEnabled } from '@/lib/comms-prefs'
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

  const db = tenantDb(tenant.id)
  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data: oldBooking } = (await db
    .from('bookings')
    .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
    .eq('id', id)
    .single()) as { data: { client_id: string | null; start_time: string } | null }
  if (!oldBooking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const auth = await protectClientAPI(tenant.id, oldBooking.client_id ?? undefined)
  if (auth instanceof NextResponse) return auth

  // A client picking who does their job must stay inside their own tenant's
  // active roster — same gate /api/client/preferred-cleaner already enforces.
  // Without this, team_member_id was written straight from client input with
  // no ownership check, letting a client point their booking's assignee FK at
  // any team_members row (including another tenant's), which then leaks that
  // employee's name/rate into this tenant's booking joins.
  if (body.team_member_id) {
    const { data: member } = (await db
      .from('team_members')
      .select('id, active')
      .eq('id', body.team_member_id)
      .single()) as { data: { active: boolean | null } | null }
    if (!member || member.active === false) {
      return NextResponse.json({ error: 'Cleaner not available' }, { status: 400 })
    }
  }

  const tz = tenant.timezone || 'America/New_York'
  const oldDate = fmtDate(oldBooking.start_time, tz)
  const oldTime = fmtTime(oldBooking.start_time, tz)

  const { data: updated, error } = await db
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

    // 1. Client confirmation email — same standard template for every
    // tenant (nycmaid used to get its own hardcoded legacy template here;
    // every other tenant got a raw unbranded inline-HTML email instead of
    // the standard tenant-branded shell every other transactional email uses).
    if (updated.clients?.email && tenant.resend_api_key && (await isCommEnabled(tenant.id, 'reschedule', 'email'))) {
      await notify({
        tenantId: tenant.id,
        type: 'booking_rescheduled',
        title: `Booking Rescheduled — ${tenant.name}`,
        message: `Your appointment moved to ${newDate} at ${newTime}.`,
        channel: 'email',
        recipientType: 'client',
        recipientId: updated.client_id,
        bookingId: id,
        metadata: { clientName: updated.clients?.name, oldDateTime: `${oldDate} at ${oldTime}`, newDateTime: `${newDate} at ${newTime}` },
      }).catch(() => {})
      await db.from('email_logs').insert({
        booking_id: id,
        email_type: 'client_reschedule',
        recipient: updated.clients.email,
      }).then(() => {}, () => {})
    }

    // 2. Client SMS
    if (updated.clients?.phone && tenant.telnyx_api_key && tenant.telnyx_phone && (await isCommEnabled(tenant.id, 'reschedule', 'sms'))) {
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
