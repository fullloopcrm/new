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
import { escapeHtml } from '@/lib/escape-html'

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

// Mirrors this route's own consumer-site callers' canReschedule() gate
// exactly — site/book, wash-and-fold-hoboken, wash-and-fold-nyc, and
// the-florida-maid all compute the identical rule (one-time bookings can
// never be rescheduled; recurring ones need 7+ days notice) before showing
// the "Reschedule" button, but none of it was ever enforced here. Same
// destructive-op-no-server-guard shape as items (118)/(122)/(123)/(124):
// a client hitting this route directly could reschedule a one-time booking
// the UI says can never move, jump the 7-day staffing-notice window, or —
// since this route also never checked status — silently move a cancelled
// booking's date forward without touching its status column, leaving it
// invisible to admin (bookings queries filter .neq('status','cancelled'))
// while the client believed the reschedule succeeded.
const RESCHEDULABLE_STATUSES = ['pending', 'scheduled', 'confirmed']
const MIN_RESCHEDULE_NOTICE_DAYS = 7

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
    .single()) as { data: { client_id: string | null; start_time: string; end_time: string | null; status: string; recurring_type: string | null } | null }
  if (!oldBooking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const auth = await protectClientAPI(tenant.id, oldBooking.client_id ?? undefined)
  if (auth instanceof NextResponse) return auth

  if (body.start_time || body.end_time) {
    if (!RESCHEDULABLE_STATUSES.includes(oldBooking.status)) {
      return NextResponse.json({ error: 'This booking can no longer be rescheduled' }, { status: 400 })
    }
    if (!oldBooking.recurring_type) {
      return NextResponse.json({ error: 'One-time bookings cannot be rescheduled' }, { status: 400 })
    }
    const daysUntil = Math.ceil((new Date(oldBooking.start_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysUntil < MIN_RESCHEDULE_NOTICE_DAYS) {
      return NextResponse.json({ error: `Reschedules require at least ${MIN_RESCHEDULE_NOTICE_DAYS} days notice` }, { status: 400 })
    }
  }

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

  // Same-day = emergency (same server-side determination as the AI/SMS
  // create_booking tool, client/book, and portal/bookings — see P11.8/16/17).
  // This is the reschedule path's version of the same gap: a client could
  // book routine service for next week (routine rate, is_emergency=false)
  // then use THIS endpoint to move it to today, and until now the row's
  // price/is_emergency were never re-evaluated — start_time/end_time were
  // the only fields ever written here. Only recompute when the client is
  // actually changing the date (body.start_time present); a team-member-only
  // reassignment must not touch pricing.
  let emergencyOverride: { hourly_rate: number; price: number } | null = null
  // `tz` (above) is the tenant's actual configured timezone — comparing raw
  // UTC calendar-date substrings (the old `.split('T')[0]` vs. the server's
  // default-zone "today") silently missed same-day emergencies during the
  // multi-hour evening window before local midnight, when UTC has already
  // rolled to the next calendar day. Same root cause fixed in the AI/SMS
  // bot's create/reschedule tools (selena/core.ts, selena-legacy.ts).
  const becomesEmergency = body.start_time
    ? new Date(body.start_time).toLocaleDateString('en-CA', { timeZone: tz }) === new Date().toLocaleDateString('en-CA', { timeZone: tz })
    : null
  if (becomesEmergency) {
    const selenaConfig = (tenant as { selena_config?: { emergency_available?: boolean; emergency_rate?: number } | null }).selena_config
    if (selenaConfig?.emergency_available && selenaConfig.emergency_rate) {
      const startMs = new Date(body.start_time as string).getTime()
      const endMs = new Date(body.end_time ?? oldBooking.end_time ?? body.start_time as string).getTime()
      const durationHours = Math.max((endMs - startMs) / 3_600_000, 0.25)
      emergencyOverride = {
        hourly_rate: selenaConfig.emergency_rate,
        price: Math.round(selenaConfig.emergency_rate * durationHours * 100),
      }
    }
  }

  const { data: updated, error } = await db
    .from('bookings')
    .update({
      start_time: body.start_time,
      end_time: body.end_time,
      ...(body.team_member_id !== undefined ? { team_member_id: body.team_member_id } : {}),
      ...(becomesEmergency !== null ? { is_emergency: becomesEmergency } : {}),
      ...(emergencyOverride ?? {}),
    })
    .eq('id', id)
    .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')
    .single()
  if (error || !updated) return NextResponse.json({ error: error?.message || 'Update failed' }, { status: 500 })

  // Async fan-out — never block the response on notification failures.
  void (async () => {
    const newDate = body.start_time ? fmtDate(body.start_time, tz) : ''
    const newTime = body.start_time ? fmtTime(body.start_time, tz) : ''
    // Item (56) fixed the team-member push/quiet-hours leg of this exact
    // reschedule-into-emergency event; the client's own two channels below
    // (email + SMS) were still silent about the urgency/rate change they're
    // the ones actually billed for. Computed once here, ahead of the
    // client-facing blocks rather than only inside the team-member block.
    const isEmergency = Boolean(updated.is_emergency)

    // 1. Client confirmation email
    if (updated.clients?.email && tenant.resend_api_key) {
      const urgentNotice = isEmergency
        ? '<p style="color:#b91c1c;"><strong>🚨 This is now a same-day/emergency appointment</strong> — our emergency rate applies.</p>'
        : ''
      const html = `<div style="font-family:system-ui;-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <h2>Your booking has been rescheduled</h2>
        <p><strong>${escapeHtml(tenant.name)}</strong> moved your appointment.</p>
        <p><strong>From:</strong> ${oldDate} at ${oldTime}<br/><strong>To:</strong> ${newDate} at ${newTime}</p>
        ${urgentNotice}
      </div>`
      await sendEmail({
        to: updated.clients.email,
        subject: `Booking rescheduled — ${tenant.name}`,
        html,
        resendApiKey: tenant.resend_api_key,
        from: tenant.email_from || undefined,
      }).catch(() => {})
      await db.from('email_logs').insert({
        booking_id: id,
        email_type: 'client_reschedule',
        recipient: updated.clients.email,
      }).then(() => {}, () => {})
    }

    // 2. Client SMS
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

    // 4. Team member (if assigned)
    if (updated.team_member_id) {
      await notifyTeamMember({
        tenantId: tenant.id,
        teamMemberId: updated.team_member_id,
        type: 'job_rescheduled',
        title: isEmergency ? '🚨 Job Rescheduled — Now Urgent' : 'Job Rescheduled',
        message: isEmergency
          ? `${updated.clients?.name || 'Client'} moved to ${newDate} — now same-day/urgent`
          : `${updated.clients?.name || 'Client'} moved to ${newDate}`,
        bookingId: id,
        smsMessage: smsJobRescheduled(tenant.name, updated),
        isEmergency,
      }).catch(() => {})
    }
  })()

  return NextResponse.json(updated)
}
