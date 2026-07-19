import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { pick } from '@/lib/validate'
import { checkMemberDayOff } from '@/lib/availability'
import { notify } from '@/lib/notify'
import { sendSMS } from '@/lib/sms'
import { smsJobAssignment } from '@/lib/sms-templates'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { audit } from '@/lib/audit'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
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
    const fields = pick(body, ['client_id', 'team_member_id', 'service_type_id', 'start_time', 'end_time', 'notes', 'special_instructions', 'status', 'hourly_rate', 'pay_rate', 'actual_hours', 'team_pay', 'team_paid', 'discount_enabled', 'discount_percent', 'one_time_credit_cents', 'one_time_credit_reason', 'price', 'check_in_time', 'check_out_time', 'video_dispute_hold'])

    // client_id/team_member_id/service_type_id are cross-table FKs — confirm
    // each belongs to this tenant before writing it, or a caller could
    // reassign the booking to another tenant's row and exfiltrate its PII via
    // the clients()/team_members() joins on both this route's GET and this
    // PUT's own response.
    const fkChecks: Array<[string | undefined, string]> = [
      [fields.client_id as string | undefined, 'clients'],
      [fields.team_member_id as string | undefined, 'team_members'],
      [fields.service_type_id as string | undefined, 'service_types'],
    ]
    for (const [fkId, table] of fkChecks) {
      if (!fkId) continue
      const { data: owned } = await supabaseAdmin
        .from(table)
        .select('id')
        .eq('id', fkId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!owned) return NextResponse.json({ error: `Invalid ${table === 'clients' ? 'client_id' : table === 'team_members' ? 'team_member_id' : 'service_type_id'}` }, { status: 400 })
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

    if (!oldBooking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check-then-act, not atomic: the read above is a stale snapshot -- a
    // concurrent status change (customer cancel via the portal, the dedicated
    // PATCH /api/bookings/[id]/status transition, a payment webhook) can land
    // between that read and this write. Without re-asserting the pre-read
    // status in THIS update's own WHERE, this blind write (which may itself
    // carry a stale `fields.status` from the same snapshot) would silently
    // clobber whatever the concurrent action just set.
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('status', oldBooking.status)
      .select('*, clients(name, phone, address, email), team_members!bookings_team_member_id_fkey(name, phone)')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json(
        { error: 'This booking changed status concurrently — refresh instead of editing' },
        { status: 409 },
      )
    }

    // GET /api/bookings/:id/team and closeout-summary both source the LEAD
    // from booking_team_members, not bookings.team_member_id (falling back to
    // the latter only when the table has zero rows for the booking) -- this
    // is the main single-booking edit endpoint, and it's also the endpoint
    // the dashboard's Check-In (Admin) / Confirm Check Out actions call to
    // (re)assign the crew member in the same request. It wrote
    // bookings.team_member_id above without ever syncing
    // booking_team_members, unlike every other team_member_id write site
    // (POST /api/bookings, PUT /api/bookings/[id]/team, schedule-issues fix,
    // team-portal/jobs/reassign, recurring-schedules regenerate/exception).
    // Left unsynced, a job dispatched/reassigned here showed as unassigned
    // in the admin Team panel, and — worse — a multi-tech job already holding
    // booking_team_members rows for its extras would silently drop the lead
    // from closeout-summary's payout attribution entirely (its fallback only
    // fires when the table has ZERO rows, not zero is_lead rows).
    if ('team_member_id' in fields) {
      const newLead = fields.team_member_id as string | null | undefined
      await supabaseAdmin.from('booking_team_members').delete().eq('tenant_id', tenantId).eq('booking_id', id).eq('is_lead', true)
      if (newLead) {
        const upsertLead = () =>
          supabaseAdmin.from('booking_team_members').upsert(
            { tenant_id: tenantId, booking_id: id, team_member_id: newLead, is_lead: true, position: 1 },
            { onConflict: 'booking_id,team_member_id' }
          )
        let { error: leadSyncErr } = await upsertLead()
        if (leadSyncErr) {
          await supabaseAdmin.from('booking_team_members').delete().eq('tenant_id', tenantId).eq('booking_id', id).eq('is_lead', true)
          ;({ error: leadSyncErr } = await upsertLead())
        }
        if (leadSyncErr) {
          console.error('[bookings PUT] booking_team_members lead sync failed after retry:', leadSyncErr)
        }
      }
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
        if (data.clients?.phone && hasSMS) {
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
      if (timeChanged && data.clients?.phone && hasSMS) {
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
      .select('*, clients(name, phone, email), team_members!bookings_team_member_id_fkey(name, phone)')
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
        if (booking.clients?.phone && hasSMS) {
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
