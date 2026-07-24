import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { pick } from '@/lib/validate'
import { checkMemberDayOff } from '@/lib/availability'
import { notify } from '@/lib/notify'
import { isCommEnabled } from '@/lib/comms-prefs'
import { sendSMS } from '@/lib/sms'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { teamSmsTemplates } from '@/lib/messaging/team-sms-resolver'
import { audit } from '@/lib/audit'
import { isNycMaid } from '@/lib/nycmaid/tenant'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantForRequest()
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
    // discount_enabled and video_dispute_hold are NOT real bookings columns --
    // discount_enabled is pure client-side form state (BookingsAdmin.tsx
    // derives it from discount_percent, `hasDiscount = !!booking.discount_percent`,
    // and never reads it back from the DB); video_dispute_hold has no reader
    // or writer anywhere else in the codebase. Including either in the
    // allowlist made PostgREST reject the ENTIRE update whenever the field
    // was present in the body ("Could not find the 'discount_enabled' column
    // ... in the schema cache") -- since BookingsAdmin.tsx spreads the whole
    // form (which always sets discount_enabled) into every save, this broke
    // saving ANY booking edit, not just discounted ones.
    const fields = pick(body, ['client_id', 'team_member_id', 'service_type_id', 'property_id', 'start_time', 'end_time', 'notes', 'special_instructions', 'status', 'hourly_rate', 'pay_rate', 'actual_hours', 'team_member_pay', 'team_member_paid', 'discount_percent', 'one_time_credit_cents', 'one_time_credit_reason', 'price', 'check_in_time', 'check_out_time', 'payment_status', 'payment_method'])
    const db = tenantDb(tenantId)

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
    if (fields.property_id) {
      const { data: ownedProperty } = await supabaseAdmin
        .from('client_properties')
        .select('id')
        .eq('id', fields.property_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!ownedProperty) {
        return NextResponse.json({ error: 'Address not found' }, { status: 404 })
      }
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
      .select('*, clients(name, phone, address, email), team_members!bookings_team_member_id_fkey(name, phone, pin)')
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

      // Booking confirmed (status changed to scheduled) — nycmaid gets its
      // own rich branded template; every other tenant gets the standard one.
      // Jeff's explicit call (2026-07-23): keep nycmaid's rich template here
      // even though a concurrent pass unified every other nycmaid email
      // (including this one, and its sibling cancellation email below) onto
      // the standard template — reverted, then re-applied, by request, for
      // confirmation specifically.
      //
      // OR'd with (memberChanged && data.status === 'scheduled'): client
      // self-service bookings insert directly at status 'scheduled' (see
      // create_booking_atomic), so status never "changes" when a cleaner is
      // assigned afterward via a team_member_id-only update — the client
      // never got a confirmation at all. Root-caused via nycmaid booking
      // 8e1e4cf2 (Paul Oberbeck, 2026-07-24): notifications/email_logs
      // showed team_assignment SMS sent to the cleaner but zero client-facing
      // rows for the booking.
      if ((statusChanged && fields.status === 'scheduled') || (memberChanged && data.status === 'scheduled')) {
        if (isNycMaid(tenantId) && data.client_id) {
          const { data: nmBooking } = await supabaseAdmin
            .from('bookings')
            .select('*, clients(*), cleaners:team_members!bookings_team_member_id_fkey(*)')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single()
          if (nmBooking?.clients?.email) {
            const { clientConfirmationEmail } = await import('@/lib/nycmaid/email-templates')
            const { sendClientEmail } = await import('@/lib/nycmaid/client-contacts')
            const email = clientConfirmationEmail(nmBooking)
            await sendClientEmail(data.client_id, email.subject, email.html)
              .catch(err => console.error('nycmaid client confirmation email error:', err))
          }
        } else if (data.client_id) {
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
        if (data.clients?.phone && hasSMS && (await isCommEnabled(tenantId, 'booking_confirmed', 'sms'))) {
          sendSMS({
            to: data.clients.phone,
            body: (await clientSmsTemplatesFor(tenant.tenantId)).bookingConfirmation({ start_time: data.start_time, team_members: data.team_members }),
            telnyxApiKey: tenantData!.telnyx_api_key,
            telnyxPhone: tenantData!.telnyx_phone,
          }).catch(err => console.error('Confirm SMS error:', err))
        }
      }

      // Team member assigned/reassigned. Logs to `notifications` regardless of
      // outcome — previously this branch was fire-and-forget with only a
      // console.error on failure, so a silently-dropped SMS (e.g. the Telnyx
      // E.164 rejection this codebase hit post-cutover) left zero trace and
      // could only be diagnosed after the fact via timestamp archaeology
      // (see the Peter Martin / Sarai Aguirre incident this was built to catch).
      if (memberChanged) {
        const skipReason = !data.team_members?.phone
          ? 'no phone on file'
          : !hasSMS
            ? 'tenant SMS not configured'
            : null
        if (data.team_members?.phone && hasSMS && (await isCommEnabled(tenantId, 'team_assignment', 'sms'))) {
          sendSMS({
            to: data.team_members.phone,
            body: teamSmsTemplates(tenantData || {}).jobAssignment({ start_time: data.start_time, hourly_rate: data.hourly_rate, clients: data.clients, team_members: data.team_members }),
            telnyxApiKey: tenantData!.telnyx_api_key,
            telnyxPhone: tenantData!.telnyx_phone,
          }).then(() => {
            supabaseAdmin.from('notifications').insert({
              tenant_id: tenantId,
              type: 'team_assignment',
              title: 'Job Assignment SMS Sent',
              message: `${data.team_members?.name || 'Team member'} notified of assignment to ${data.clients?.name || 'client'} on ${date}`,
              channel: 'sms', recipient_type: 'team_member', recipient_id: fields.team_member_id as string,
              booking_id: id, status: 'sent',
            }).then(() => {}, () => {})
          }).catch(err => {
            console.error('Assignment SMS error:', err)
            supabaseAdmin.from('notifications').insert({
              tenant_id: tenantId,
              type: 'team_assignment',
              title: 'Job Assignment SMS Failed',
              message: `${data.team_members?.name || 'Team member'} was NOT notified of assignment to ${data.clients?.name || 'client'} on ${date}: ${err instanceof Error ? err.message : String(err)}`,
              channel: 'sms', recipient_type: 'team_member', recipient_id: fields.team_member_id as string,
              booking_id: id, status: 'failed',
            }).then(() => {}, () => {})
          })
        } else {
          // Assignment happened but no SMS was even attempted — surface why.
          const reason = skipReason || 'team_assignment SMS disabled in comms settings'
          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenantId,
            type: 'team_assignment',
            title: 'Job Assignment SMS Skipped',
            message: `${data.team_members?.name || 'Team member'} was NOT notified of assignment to ${data.clients?.name || 'client'} on ${date}: ${reason}`,
            channel: 'sms', recipient_type: 'team_member', recipient_id: fields.team_member_id as string,
            booking_id: id, status: 'skipped',
          }).then(() => {}, () => {})
        }
      }

      // Rescheduled
      if (timeChanged && data.clients?.phone && hasSMS && (await isCommEnabled(tenantId, 'reschedule', 'sms'))) {
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
      .select('*, clients(name, phone, email), team_members!bookings_team_member_id_fkey(name, phone)')
      .eq('id', id)
      .single()) as { data: { client_id: string | null; start_time: string; service_type?: string | null; clients: { name?: string | null; phone?: string | null; email?: string | null } | null } | null }

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

        // Client cancellation email — same standard template for every tenant,
        // nycmaid included. It used to get an nycmaid-only hardcoded template
        // (its own logo/phone/link baked in) that looked inconsistent with
        // every other transactional email, which itself uses this same
        // notify()/genericNotificationEmail path with tenant branding injected.
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
            // No bookingId — the booking row is already deleted by this point
            // (DELETE runs before this notification), so any bookingId here
            // would violate notifications_booking_id_fkey on INSERT.
            metadata: { clientName: booking.clients?.name, serviceName: booking.service_type },
          })
        }

        // Client cancellation SMS
        if (booking.clients?.phone && hasSMS && (await isCommEnabled(tenantId, 'cancellation', 'sms'))) {
          sendSMS({
            to: booking.clients.phone,
            body: (await clientSmsTemplatesFor(tenant.tenantId)).cancellation({ start_time: booking.start_time }),
            telnyxApiKey: tenantData!.telnyx_api_key,
            telnyxPhone: tenantData!.telnyx_phone,
          }).catch(err => console.error('Cancellation SMS error:', err))
        }
      } catch (notifErr) {
        console.error('Cancellation notification error:', notifErr)
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'comms_fail',
          title: 'Cancellation notification failed',
          message: notifErr instanceof Error ? `${notifErr.message}\n${notifErr.stack}` : String(notifErr),
          channel: 'email',
          status: 'failed',
        }).then(() => {}, () => {})
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
