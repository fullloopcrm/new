import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { sendSMS } from '@/lib/sms'
import { notify } from '@/lib/notify'
import { sendPushToTenantAdmins, sendPushToClient } from '@/lib/push'
import { smsRunningLateClient, smsRunningLateAdmin } from '@/lib/sms-templates'
import { rateLimitDb } from '@/lib/rate-limit-db'

export async function POST(request: Request) {
  try {
    // Auth: this fires client + admin SMS, so it must be gated. The member is
    // taken from the verified token; a member can only report late on their OWN
    // booking, scoped to the token's tenant.
    const { auth, error } = await requirePortalPermission(request, 'jobs.view_own')
    if (error) return error

    // A team member is the lowest-trust authenticated tier, and each call fires
    // a real SMS to both the client's and admin's phone with no other cap --
    // without this, looping the endpoint is unmetered SMS-cost-abuse/harassment
    // against a real client phone number.
    const rl = await rateLimitDb(`running-late:${auth.id}`, 5, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
    }

    const { bookingId, eta } = await request.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

    const { data: booking } = await tenantDb(auth.tid)
      .from('bookings')
      .select('id, tenant_id, start_time, team_member_id, client_id, clients(name, phone), team_members!bookings_team_member_id_fkey(name)')
      .eq('id', bookingId)
      .eq('team_member_id', auth.id)
      .single()

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
    await tenantDb(tenantId).from('bookings').update({ running_late_at: new Date().toISOString(), running_late_eta: eta || null }).eq('id', bookingId)

    // Notify admin
    await notify({ tenantId, type: 'booking_reminder' as any, title: 'Running Late', message: `${memberName} running late for ${clientName} (${time})${eta ? ` — ETA ${eta} min` : ''}`, bookingId })

    // SMS to admin
    const adminPhone = tenant.owner_phone || tenant.phone
    if (adminPhone && tenant.telnyx_api_key && tenant.telnyx_phone) {
      sendSMS({ to: adminPhone.startsWith('+') ? adminPhone : `+1${adminPhone}`, body: smsRunningLateAdmin(tenant.name, memberName, clientName, time, eta), telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone }).catch(() => {})
    }

    sendPushToTenantAdmins(tenantId, 'Running Late', `${memberName} — ${clientName} at ${time}`, '/dashboard/bookings').catch(() => {})

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
