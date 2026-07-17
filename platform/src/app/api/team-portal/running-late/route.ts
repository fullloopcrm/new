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
      .select('id, tenant_id, start_time, team_member_id, client_id, is_emergency, clients(name, phone), team_members!bookings_team_member_id_fkey(name)')
      .eq('id', bookingId)
      .eq('team_member_id', auth.id)
      .single()) as { data: { tenant_id: string; start_time: string; client_id: string | null; is_emergency: boolean | null; clients: unknown; team_members: unknown } | null }

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const tenantId = booking.tenant_id
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, owner_phone, phone, telnyx_api_key, telnyx_phone')
      .eq('id', tenantId)
      .single()

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const memberName = (booking.team_members as any)?.name || 'Team member'
    const clientName = (booking.clients as any)?.name || 'Client'
    const clientPhone = (booking.clients as any)?.phone
    const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    // Record on booking
    await db.from('bookings').update({ running_late_at: new Date().toISOString(), running_late_eta: eta || null }).eq('id', bookingId)

    // Notify admin — 🚨 escalation on an emergency job, same convention
    // schedule-monitor/job-release/admin-new-booking already apply elsewhere
    // (items 20/24/26): a same-day emergency running late is a different
    // severity of problem than a routine job running a few minutes behind.
    const isEmergency = !!booking.is_emergency
    await notify({
      tenantId,
      type: 'booking_reminder' as any,
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

    // SMS to client
    if (clientPhone && tenant.telnyx_api_key && tenant.telnyx_phone) {
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
