import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { pick } from '@/lib/validate'
import { checkMemberDayOff } from '@/lib/availability'
import { notify } from '@/lib/notify'
import { sendSMS } from '@/lib/sms'
import { smsJobAssignment } from '@/lib/sms-templates'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { audit } from '@/lib/audit'
import { getTerminatedTeamMemberIds } from '@/lib/hr'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('*, clients(name, phone, address, email), team_members!bookings_team_member_id_fkey(name, phone, email)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ booking: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json()
    // service_type (free text) is the only field the edit modal's own service
    // dropdown writes (BookingsAdmin.tsx form.service_type) -- service_type_id
    // is a separate FK the admin UI never populates. Without it here, every
    // admin correction to a booking's service type via the edit modal was
    // silently dropped by pick() (bug class identical to the batch-update
    // cleaner_id/team_member_id field-name gap, just a missing field instead
    // of a wrong name).
    const fields = pick(body, ['client_id', 'team_member_id', 'service_type_id', 'service_type', 'start_time', 'end_time', 'notes', 'special_instructions', 'status', 'hourly_rate', 'pay_rate', 'actual_hours', 'team_pay', 'team_paid', 'discount_enabled', 'price'])

    // client_id/team_member_id/service_type_id are caller-supplied FKs — this
    // route's own response (and every GET) embeds clients(name/phone/address/
    // email) + team_members(name/phone) off the row, so a foreign id would
    // leak another tenant's client/team-member PII immediately. Same guard as
    // POST /api/bookings (register P1).
    if (fields.client_id) {
      const { data: ownedClient } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('id', fields.client_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!ownedClient) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
    }
    if (fields.team_member_id) {
      const { data: ownedMember } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('id', fields.team_member_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!ownedMember) {
        return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      }
      // Same guard as POST /api/bookings and the job-session routes
      // (86b797ad) -- a let-go team member must not be silently reassigned
      // onto a booking, new or existing.
      const terminatedIds = await getTerminatedTeamMemberIds(tenantId, [fields.team_member_id as string])
      if (terminatedIds.length > 0) {
        return NextResponse.json({ error: 'This team member is no longer active and cannot be assigned.' }, { status: 400 })
      }
    }
    if (fields.service_type_id) {
      const { data: ownedService } = await supabaseAdmin
        .from('service_types')
        .select('id')
        .eq('id', fields.service_type_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!ownedService) {
        return NextResponse.json({ error: 'Service type not found' }, { status: 404 })
      }
    }

    // Check if team member has the day off or doesn't work that day
    if (fields.team_member_id && !body.force) {
      // Get the booking's start_time (from update or existing record)
      let bookingDate = fields.start_time ? (fields.start_time as string).split('T')[0] : null
      if (!bookingDate) {
        const { data: existing } = await supabaseAdmin
          .from('bookings')
          .select('start_time')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single()
        if (existing) bookingDate = existing.start_time.split('T')[0]
      }
      if (bookingDate) {
        const dayOff = await checkMemberDayOff(tenantId, fields.team_member_id as string, bookingDate)
        if (dayOff.unavailable) {
          return NextResponse.json({
            error: dayOff.reason,
            unavailable: true,
          }, { status: 409 })
        }
      }
    }

    // Get old booking for change detection
    const { data: oldBooking } = await supabaseAdmin
      .from('bookings')
      .select('status, team_member_id, start_time')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*, clients(name, phone, address, email, sms_consent, do_not_service), team_members!bookings_team_member_id_fkey(name, phone)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send notifications based on what changed
    try {
      const { data: tenantData } = await supabaseAdmin
        .from('tenants')
        .select('name, telnyx_api_key, telnyx_phone')
        .eq('id', tenantId)
        .single()
      const bizName = tenantData?.name || 'Your Business'
      const hasSMS = !!(tenantData?.telnyx_api_key && tenantData?.telnyx_phone)
      const date = new Date(data.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const time = new Date(data.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

      const statusChanged = fields.status && fields.status !== oldBooking?.status
      const memberChanged = fields.team_member_id && fields.team_member_id !== oldBooking?.team_member_id
      const timeChanged = fields.start_time && fields.start_time !== oldBooking?.start_time

      // Booking confirmed (status changed to scheduled) — do_not_service /
      // sms_consent, same invariant every other client fan-out enforces;
      // both sends fired unconditionally before this fix.
      if (statusChanged && fields.status === 'scheduled') {
        if (data.client_id && !data.clients?.do_not_service) {
          await notify({
            tenantId,
            type: 'booking_confirmed',
            title: `Booking Confirmed — ${date}`,
            message: `Your appointment on ${date} at ${time} is confirmed.`,
            channel: 'email',
            recipientType: 'client',
            recipientId: data.client_id,
            bookingId: id,
            metadata: { clientName: data.clients?.name, serviceName: data.service_type },
          })
        }
        if (data.clients?.phone && data.clients?.sms_consent !== false && !data.clients?.do_not_service && hasSMS) {
          sendSMS({
            to: data.clients.phone,
            body: (await clientSmsTemplatesFor(tenant.tenantId)).bookingConfirmation({ start_time: data.start_time, team_members: data.team_members }),
            telnyxApiKey: tenantData!.telnyx_api_key,
            telnyxPhone: tenantData!.telnyx_phone,
          }).catch(err => console.error('Confirm SMS error:', err))
        }
      }

      // Team member assigned/reassigned
      if (memberChanged && data.team_members?.phone && hasSMS) {
        sendSMS({
          to: data.team_members.phone,
          body: smsJobAssignment(bizName, { start_time: data.start_time, clients: data.clients }),
          telnyxApiKey: tenantData!.telnyx_api_key,
          telnyxPhone: tenantData!.telnyx_phone,
        }).catch(err => console.error('Assignment SMS error:', err))
      }

      // Rescheduled
      if (timeChanged && data.clients?.phone && data.clients?.sms_consent !== false && !data.clients?.do_not_service && hasSMS) {
        sendSMS({
          to: data.clients.phone,
          body: (await clientSmsTemplatesFor(tenant.tenantId)).reschedule({ start_time: data.start_time }),
          telnyxApiKey: tenantData!.telnyx_api_key,
          telnyxPhone: tenantData!.telnyx_phone,
        }).catch(err => console.error('Reschedule SMS error:', err))
      }
    } catch (notifErr) {
      console.error('Booking update notification error:', notifErr)
    }

    await audit({ tenantId, action: 'booking.updated', entityType: 'booking', entityId: id, details: { fields: Object.keys(fields) } })

    return NextResponse.json({ booking: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('bookings.delete')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    // Get booking details before deleting for notifications
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('*, clients(name, phone, email, sms_consent, do_not_service), team_members!bookings_team_member_id_fkey(name, phone)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    const { error } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send cancellation notifications
    if (booking) {
      try {
        const { data: tenantData } = await supabaseAdmin
          .from('tenants')
          .select('name, telnyx_api_key, telnyx_phone')
          .eq('id', tenantId)
          .single()
        const bizName = tenantData?.name || 'Your Business'
        const hasSMS = !!(tenantData?.telnyx_api_key && tenantData?.telnyx_phone)

        // Client cancellation email — do_not_service blocks; both sends
        // fired unconditionally before this fix.
        if (booking.client_id && !booking.clients?.do_not_service) {
          const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          await notify({
            tenantId,
            type: 'booking_cancelled',
            title: `Booking Cancelled — ${date}`,
            message: `Your appointment on ${date} has been cancelled.`,
            channel: 'email',
            recipientType: 'client',
            recipientId: booking.client_id,
            bookingId: id,
            metadata: { clientName: booking.clients?.name },
          })
        }

        // Client cancellation SMS
        if (booking.clients?.phone && booking.clients?.sms_consent !== false && !booking.clients?.do_not_service && hasSMS) {
          sendSMS({
            to: booking.clients.phone,
            body: (await clientSmsTemplatesFor(tenant.tenantId)).cancellation({ start_time: booking.start_time }),
            telnyxApiKey: tenantData!.telnyx_api_key,
            telnyxPhone: tenantData!.telnyx_phone,
          }).catch(err => console.error('Cancellation SMS error:', err))
        }
      } catch (notifErr) {
        console.error('Cancellation notification error:', notifErr)
      }
    }

    await audit({ tenantId, action: 'booking.deleted', entityType: 'booking', entityId: id })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
