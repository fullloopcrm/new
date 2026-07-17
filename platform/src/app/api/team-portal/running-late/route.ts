import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { sendSMS } from '@/lib/sms'
import { notify } from '@/lib/notify'
import { sendPushToTenantAdmins, sendPushToClient } from '@/lib/push'
import { smsRunningLateClient, smsRunningLateAdmin } from '@/lib/sms-templates'

export async function POST(request: Request) {
  try {
    // Auth: this fires client + admin SMS, so it must be gated. The member is
    // taken from the verified token; a member can only report late on their OWN
    // booking, scoped to the token's tenant.
    const { auth, error } = await requirePortalPermission(request, 'jobs.view_own')
    if (error) return error

    const { bookingId, eta } = await request.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

    const db = tenantDb(auth.tid)
    // tenantDb's select() takes a non-literal `columns` param, which widens
    // supabase-js's column-string type inference — cast to the shape actually selected.
    const { data: booking } = (await db
      .from('bookings')
      .select('id, tenant_id, start_time, team_member_id, client_id, is_emergency, clients(name, phone, sms_consent), team_members!bookings_team_member_id_fkey(name)')
      .eq('id', bookingId)
      .eq('team_member_id', auth.id)
      .single()) as { data: { tenant_id: string; start_time: string; client_id: string | null; is_emergency: boolean | null; clients: unknown; team_members: unknown } | null }

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const tenantId = booking.tenant_id
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, owner_phone, phone, telnyx_api_key, telnyx_phone, timezone')
      .eq('id', tenantId)
      .single()

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const memberName = (booking.team_members as any)?.name || 'Team member'
    const clientName = (booking.clients as any)?.name || 'Client'
    const clientPhone = (booking.clients as any)?.phone
    const clientSmsConsent = (booking.clients as any)?.sms_consent
    const time = new Date(booking.start_time).toLocaleTimeString('en-US', { timeZone: tenant.timezone || 'America/New_York', hour: 'numeric', minute: '2-digit' })

    // Record on booking
    await db.from('bookings').update({ running_late_at: new Date().toISOString(), running_late_eta: eta || null }).eq('id', bookingId)

    // Notify admin — 🚨 escalation on an emergency job, same convention
    // schedule-monitor/job-release/admin-new-booking already apply elsewhere
    // (items 20/24/26): a same-day emergency running late is a different
    // severity of problem than a routine job running a few minutes behind.
    //
    // channel explicitly 'sms' (not the default 'email'): this call exists to
    // populate the admin notifications row below the dashboard bell — the
    // route already sends its own purpose-built admin SMS/push right after.
    // Left on the default, notify() rendered this through bookingReminderEmail
    // (the case for 'booking_reminder', the closest valid NotificationType),
    // a CLIENT appointment-reminder template — every late report silently
    // emailed the owner an "Appointment Reminder" for client "Client" whose
    // "Date & Time" was this ops message text. recipientType stays the
    // default 'admin', which notify() never resolves a phone for, so this is
    // a no-op send (skipped, not failed) — the in-app row (unconditional,
    // above the channel branch) is the only observable effect, as intended.
    const isEmergency = !!booking.is_emergency
    await notify({
      tenantId,
      type: 'booking_reminder' as any,
      channel: 'sms',
      title: isEmergency ? '🚨 Emergency Job Running Late' : 'Running Late',
      message: `${isEmergency ? '🚨 EMERGENCY — ' : ''}${memberName} running late for ${clientName} (${time})${eta ? ` — ETA ${eta} min` : ''}`,
      bookingId,
    })

    // SMS to admin
    const adminPhone = tenant.owner_phone || tenant.phone
    if (adminPhone && tenant.telnyx_api_key && tenant.telnyx_phone) {
      sendSMS({ to: adminPhone.startsWith('+') ? adminPhone : `+1${adminPhone}`, body: smsRunningLateAdmin(tenant.name, memberName, clientName, time, eta, isEmergency), telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone }).catch(() => {})
    }

    sendPushToTenantAdmins(tenantId, isEmergency ? '🚨 Emergency Job Running Late' : 'Running Late', `${memberName} — ${clientName} at ${time}`, '/dashboard/bookings').catch(() => {})

    // SMS to client — gated on sms_consent, matching the codebase's own
    // established convention (items 19/21/23/31): a client who texted STOP
    // shouldn't get another SMS, transactional or not.
    if (clientPhone && clientSmsConsent !== false && tenant.telnyx_api_key && tenant.telnyx_phone) {
      sendSMS({ to: clientPhone, body: smsRunningLateClient(tenant.name, memberName, eta), telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone }).catch(() => {})
    }
    if (booking.client_id) {
      sendPushToClient(booking.client_id, 'Running Late', `${memberName.split(' ')[0]} is running a few minutes behind`, '/portal').catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Running late error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
