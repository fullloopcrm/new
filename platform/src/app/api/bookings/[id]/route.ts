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
        .select('name, slug, industry, phone, website_url, domain, domain_name, google_place_id, telnyx_api_key, telnyx_phone, timezone')
        .eq('id', tenantId)
        .single()
      const hasSMS = !!(tenantData?.telnyx_api_key && tenantData?.telnyx_phone)
      const tz = tenantData?.timezone || 'America/New_York'
      const date = new Date(data.start_time).toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' })
      const time = new Date(data.start_time).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })

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

      // Reassigned AWAY from a previous tech, OR explicitly unassigned
      // outright (team_member_id: null) — the block above only ever reaches
      // a NEW assignee, so either case leaves the outgoing tech with no
      // signal the job left their plate; same "silently vanished" risk item
      // (17) already fixed for outright cancellation. `'team_member_id' in
      // fields` distinguishes an explicit null (pick() keeps it, see
      // src/lib/validate.ts) from the field simply not being sent (pick()
      // drops undefined) — memberChanged alone is false for the null case
      // since it requires fields.team_member_id to be truthy, which is why
      // this was missed before: an explicit unassign silently matched
      // neither "reassigned" nor "unchanged".
      const explicitlyUnassigned = 'team_member_id' in fields && fields.team_member_id === null
      if ((memberChanged || explicitlyUnassigned) && oldBooking?.team_member_id && hasSMS) {
        const { data: oldMember } = (await db
          .from('team_members')
          .select('phone')
          .eq('id', oldBooking.team_member_id)
          .single()) as { data: { phone: string | null } | null }
        if (oldMember?.phone) {
          const removalBody = explicitlyUnassigned
            ? `${tenantData?.name || 'Job'}: Your ${date} ${time} job has been unassigned from you.`
            : `${tenantData?.name || 'Job'}: Your ${date} ${time} job has been reassigned to another team member.`
          sendSMS({
            to: oldMember.phone,
            body: removalBody,
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('bookings.delete')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const db = tenantDb(tenantId)
    const searchParams = new URL(request.url).searchParams
    const cancelSeries = searchParams.get('cancel_series') === 'true'
    const hardDelete = searchParams.get('hard_delete') === 'true'
    const skipEmail = searchParams.get('skip_email') === 'true'

    // Get booking details before deleting/cancelling for notifications.
    // tenantDb's select() takes a non-literal `columns` param, which widens
    // supabase-js's column-string type inference — cast the narrow-select
    // result to the shape actually selected (see client/bookings for the same gap).
    const { data: booking } = (await db
      .from('bookings')
      .select('*, clients(name, phone, email, sms_consent), team_members!bookings_team_member_id_fkey(name, phone)')
      .eq('id', id)
      .single()) as { data: { status: string; schedule_id: string | null; client_id: string | null; start_time: string; clients: { name?: string | null; phone?: string | null; sms_consent?: boolean | null } | null } | null }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // cancel_series=true (BookingsAdmin's "Cancel All Future" action) —
    // this route previously ignored the param entirely and hard-deleted
    // only the single clicked booking, leaving the rest of the recurring
    // series (and the generator that keeps refilling it) completely live.
    // Delegate to the same status-flip DELETE /api/admin/recurring-schedules/
    // [id] already uses correctly — same convention, same "no client
    // notifications for a bulk series action" rule documented there.
    if (cancelSeries && booking.schedule_id) {
      const { error: schedErr } = await supabaseAdmin
        .from('recurring_schedules')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', booking.schedule_id)
        .eq('tenant_id', tenantId)
      if (schedErr) return NextResponse.json({ error: schedErr.message }, { status: 500 })

      await supabaseAdmin
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('tenant_id', tenantId)
        .eq('schedule_id', booking.schedule_id)
        .in('status', ['scheduled', 'pending'])
        .gte('start_time', new Date().toISOString())

      await audit({ tenantId, action: 'booking.status_changed', entityType: 'booking', entityId: id, details: { from: booking.status, to: 'cancelled', series: true } })
      return NextResponse.json({ success: true })
    }

    // hard_delete=true — BookingsAdmin only shows this action for a booking
    // that's already status='cancelled' (its own confirm dialog says
    // "Permanently delete this cancelled booking"); enforce that server-side
    // too rather than trusting the query param alone.
    if (hardDelete) {
      if (booking.status !== 'cancelled') {
        return NextResponse.json({ error: 'Only cancelled bookings can be permanently deleted' }, { status: 400 })
      }
      const { error } = await db.from('bookings').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      await audit({ tenantId, action: 'booking.deleted', entityType: 'booking', entityId: id })
      return NextResponse.json({ success: true })
    }

    // Default (plain DELETE, BookingsAdmin's "Cancel" action) — this route
    // previously hard-deleted the row unconditionally here too, so clicking
    // "Cancel" on ANY booking (including a completed/paid one — the button
    // shows for every non-cancelled status) permanently erased it, taking
    // any finance-report history with it. Same "destructive op on a record
    // with financial significance" shape as item (118), just the row itself
    // instead of one column. Soft-cancel instead: preserves the row, matches
    // the status-flip convention every other cancel path in this codebase
    // (recurring-schedules pause/cancel) already uses, and is what actually
    // lets the UI's own two-step "Cancel" → "Delete" flow function — right
    // now the hard-delete on step one erases the row before step two's
    // "cancelled" list can ever show it.
    const { error } = await db
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send cancellation notifications
    if (booking && !skipEmail) {
      try {
        const { data: tenantData } = await supabaseAdmin
          .from('tenants')
          .select('name, telnyx_api_key, telnyx_phone, timezone')
          .eq('id', tenantId)
          .single()
        const bizName = tenantData?.name || 'Your Business'
        const hasSMS = !!(tenantData?.telnyx_api_key && tenantData?.telnyx_phone)

        // Client cancellation email
        if (booking.client_id) {
          const date = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: tenantData?.timezone || 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
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

    await audit({ tenantId, action: 'booking.status_changed', entityType: 'booking', entityId: id, details: { from: booking.status, to: 'cancelled' } })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
