import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { pick } from '@/lib/validate'
import { checkMemberDayOff } from '@/lib/availability'
import { notify } from '@/lib/notify'
import { sendSMS } from '@/lib/sms'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { teamSmsTemplates } from '@/lib/messaging/team-sms-resolver'
import { audit } from '@/lib/audit'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant: authTenant, error: authError } = await requirePermission('bookings.view')
    if (authError) return authError
    const { tenantId } = authTenant
    const { id } = await params

    const { data, error } = await tenantDb(tenantId)
      .from('bookings')
      .select('*, clients(name, phone, address, email), team_members!bookings_team_member_id_fkey(name, phone, email)')
      .eq('id', id)
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
    const fields = pick(body, ['client_id', 'team_member_id', 'service_type_id', 'start_time', 'end_time', 'notes', 'special_instructions', 'status', 'hourly_rate', 'pay_rate', 'actual_hours', 'team_pay', 'team_paid', 'discount_enabled', 'price'])
    const db = tenantDb(tenantId)

    // Same FK-injection class already fixed on POST /api/bookings and
    // POST /api/bookings/batch: a foreign client_id/team_member_id/
    // service_type_id would otherwise leak that stranger's name/phone/
    // address/pin via this route's own post-update join, and (for
    // team_member_id) fire a real job-assignment SMS to them over this
    // tenant's own Telnyx number. tenantDb only scopes the booking row
    // itself, not the FK targets, so each caller-supplied id must be
    // confirmed to belong to this tenant before the update runs.
    if (fields.client_id) {
      const { data: clientRow } = await db.from('clients').select('id').eq('id', fields.client_id as string).single()
      if (!clientRow) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    if (fields.team_member_id) {
      const { data: memberRow } = await db.from('team_members').select('id').eq('id', fields.team_member_id as string).single()
      if (!memberRow) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }
    if (fields.service_type_id) {
      const { data: svcRow } = await db.from('service_types').select('id').eq('id', fields.service_type_id as string).single()
      if (!svcRow) return NextResponse.json({ error: 'Service type not found' }, { status: 404 })
    }

    // Check if team member has the day off or doesn't work that day
    if (fields.team_member_id && !body.force) {
      // Get the booking's start_time (from update or existing record)
      let bookingDate = fields.start_time ? (fields.start_time as string).split('T')[0] : null
      if (!bookingDate) {
        const { data: existing } = (await db
          .from('bookings')
          .select('start_time')
          .eq('id', id)
          .single()) as { data: { start_time: string } | null }
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
    const { data: oldBooking } = (await db
      .from('bookings')
      .select('status, team_member_id, start_time')
      .eq('id', id)
      .single()) as { data: { status: string; team_member_id: string | null; start_time: string } | null }

    const { data, error } = await db
      .from('bookings')
      .update(fields)
      .eq('id', id)
      .select('*, clients(name, phone, address, email, sms_consent), team_members!bookings_team_member_id_fkey(name, phone, pin)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send notifications based on what changed
    try {
      const { data: tenantData } = await supabaseAdmin
        .from('tenants')
        .select('name, slug, industry, phone, website_url, domain, domain_name, google_place_id, telnyx_api_key, telnyx_phone')
        .eq('id', tenantId)
        .single()
      const hasSMS = !!(tenantData?.telnyx_api_key && tenantData?.telnyx_phone)
      const date = new Date(data.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const time = new Date(data.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

      const statusChanged = fields.status && fields.status !== oldBooking?.status
      const memberChanged = fields.team_member_id && fields.team_member_id !== oldBooking?.team_member_id
      const timeChanged = fields.start_time && fields.start_time !== oldBooking?.start_time

      // Booking confirmed (status changed to scheduled)
      if (statusChanged && fields.status === 'scheduled') {
        if (data.client_id) {
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
        if (data.clients?.phone && data.clients?.sms_consent !== false && hasSMS) {
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
          body: teamSmsTemplates(tenantData || {}).jobAssignment({ start_time: data.start_time, hourly_rate: data.hourly_rate, pay_rate: data.pay_rate, is_emergency: data.is_emergency, clients: data.clients, team_members: data.team_members }),
          telnyxApiKey: tenantData!.telnyx_api_key,
          telnyxPhone: tenantData!.telnyx_phone,
        }).catch(err => console.error('Assignment SMS error:', err))
      }

      // Reassigned AWAY from a previous tech — the block above only ever
      // reaches the new assignee. A tech who still thinks the job is theirs
      // gets no signal it's gone; same "silently vanished" risk item (17)
      // already fixed for outright cancellation, here for reassignment.
      if (memberChanged && oldBooking?.team_member_id && hasSMS) {
        const { data: oldMember } = (await db
          .from('team_members')
          .select('phone')
          .eq('id', oldBooking.team_member_id)
          .single()) as { data: { phone: string | null } | null }
        if (oldMember?.phone) {
          sendSMS({
            to: oldMember.phone,
            body: `${tenantData?.name || 'Job'}: Your ${date} ${time} job has been reassigned to another team member.`,
            telnyxApiKey: tenantData!.telnyx_api_key,
            telnyxPhone: tenantData!.telnyx_phone,
          }).catch(err => console.error('Reassignment-removal SMS error:', err))
        }
      }

      // Rescheduled
      if (timeChanged && data.clients?.phone && data.clients?.sms_consent !== false && hasSMS) {
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
    const db = tenantDb(tenantId)

    // Get booking details before deleting for notifications
    // tenantDb's select() takes a non-literal `columns` param, which widens
    // supabase-js's column-string type inference — cast the narrow-select
    // result to the shape actually selected (see client/bookings for the same gap).
    const { data: booking } = (await db
      .from('bookings')
      .select('*, clients(name, phone, email, sms_consent), team_members!bookings_team_member_id_fkey(name, phone)')
      .eq('id', id)
      .single()) as { data: { client_id: string | null; start_time: string; clients: { name?: string | null; phone?: string | null; sms_consent?: boolean | null } | null } | null }

    const { error } = await db
      .from('bookings')
      .delete()
      .eq('id', id)

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

        // Client cancellation email
        if (booking.client_id) {
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
        if (booking.clients?.phone && booking.clients?.sms_consent !== false && hasSMS) {
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
