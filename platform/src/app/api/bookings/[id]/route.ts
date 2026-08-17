import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission, overridesFor } from '@/lib/require-permission'
import { hasPermission } from '@/lib/rbac'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { tenantClient } from '@/lib/tenant-supabase'
import { pick } from '@/lib/validate'
import { checkMemberDayOff } from '@/lib/availability'
import { notify } from '@/lib/notify'
import { isCommEnabled } from '@/lib/comms-prefs'
import { sendSMS } from '@/lib/sms'
import { logCommsFail } from '@/lib/comms-fail'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { teamSmsTemplates } from '@/lib/messaging/team-sms-resolver'
import { audit } from '@/lib/audit'
import { alertActiveBookingHardDeleted } from '@/lib/booking-deletion-alert'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { computeCheckoutPricing } from '@/lib/checkout-pricing'
import { payCleanerAtCheckout, payExtraCrewAtCheckout } from '@/lib/finance/checkout-payout'
import { clientArrivalWindow, ARRIVAL_WINDOW_NOTE } from '@/lib/nycmaid/time-window'
import { naiveToAnchoredDate } from '@/lib/naive-time'

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
    // recurring_type was the same class of gap, just silent instead of
    // 400ing: EditBookingForm.tsx's saveBooking() has sent it on every save
    // since that form existed, pick() dropped it with no error, and it never
    // reached the UPDATE. A one-time booking with "Repeat" turned on saved
    // successfully, showed no error, and simply stayed one-time in the DB --
    // schedule_id isn't included here on purpose (see recurring-schedules
    // POST, the canonical path that creates a schedule + its bookings
    // together; a bare PUT here isn't the place to attach a booking to a
    // schedule without the same ownership/consistency checks that path has).
    const fields = pick(body, ['client_id', 'team_member_id', 'service_type_id', 'property_id', 'start_time', 'end_time', 'notes', 'special_instructions', 'status', 'hourly_rate', 'pay_rate', 'actual_hours', 'team_member_pay', 'team_member_paid', 'discount_percent', 'one_time_credit_cents', 'one_time_credit_reason', 'price', 'check_in_time', 'check_out_time', 'payment_status', 'payment_method', 'recurring_type', 'referrer_id', 'sales_partner_id'])
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
      [fields.referrer_id as string | undefined, 'referrers'],
      [fields.sales_partner_id as string | undefined, 'sales_partners'],
    ]
    const fkFieldNames: Record<string, string> = {
      clients: 'client_id',
      team_members: 'team_member_id',
      service_types: 'service_type_id',
      referrers: 'referrer_id',
      sales_partners: 'sales_partner_id',
    }
    for (const [fkId, table] of fkChecks) {
      if (!fkId) continue
      const { data: owned } = await supabaseAdmin
        .from(table)
        .select('id')
        .eq('id', fkId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!owned) return NextResponse.json({ error: `Invalid ${fkFieldNames[table]}` }, { status: 400 })
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
      .select('status, team_member_id, start_time, check_in_time, hourly_rate, pay_rate, discount_percent, one_time_credit_cents, recurring_type, max_hours, team_size')
      .eq('id', id)
      .single()) as {
      data: {
        status: string
        team_member_id: string | null
        start_time: string
        check_in_time: string | null
        hourly_rate: number | null
        pay_rate: number | null
        discount_percent: number | null
        one_time_credit_cents: number | null
        recurring_type: string | null
        max_hours: number | null
        team_size: number | null
      } | null
    }

    // BookingsAdmin.tsx computes checkout price/team_member_pay client-side
    // (for an instant preview) and sends the result in this same PUT body --
    // but a request isn't a UI, and this route used to write whatever price/
    // team_member_pay/actual_hours arrived verbatim. Whenever check_out_time
    // is being set, ignore those three client-submitted fields entirely and
    // recompute them here from the booking's own trusted rate/discount/
    // credit columns via the same canonical computeCheckoutPricing() the UI
    // uses -- an honest client gets the identical result, a tampered request
    // can no longer set an arbitrary price or cleaner payout.
    let checkoutMember: { stripe_account_id?: string | null; global_payouts_recipient_id?: string | null } | null = null
    let assignedMemberId: string | null = null
    if (fields.check_out_time && oldBooking?.check_in_time) {
      assignedMemberId = (fields.team_member_id as string | undefined) ?? oldBooking.team_member_id ?? null
      let memberPayRate: number | null = null
      if (assignedMemberId) {
        const { data: member } = await supabaseAdmin
          .from('team_members')
          .select('pay_rate, stripe_account_id, global_payouts_recipient_id')
          .eq('id', assignedMemberId)
          .eq('tenant_id', tenantId)
          .maybeSingle()
        memberPayRate = (member?.pay_rate as number | null) ?? null
        checkoutMember = member ? { stripe_account_id: member.stripe_account_id as string | null, global_payouts_recipient_id: member.global_payouts_recipient_id as string | null } : null
      }
      const bookingPayRateOverride = (fields.pay_rate as number | null | undefined) ?? oldBooking.pay_rate ?? null
      const pricing = computeCheckoutPricing({
        checkInIso: oldBooking.check_in_time,
        checkOutIso: fields.check_out_time as string,
        hourlyRate: (fields.hourly_rate as number | null | undefined) ?? oldBooking.hourly_rate,
        cleanerHourlyRate: bookingPayRateOverride ?? memberPayRate,
        discountPercent: (fields.discount_percent as number | null | undefined) ?? oldBooking.discount_percent,
        oneTimeCreditCents: (fields.one_time_credit_cents as number | null | undefined) ?? oldBooking.one_time_credit_cents,
        recurringType: oldBooking.recurring_type,
        maxHours: oldBooking.max_hours,
        teamSize: (fields.team_size as number | null | undefined) ?? oldBooking.team_size,
      })
      fields.actual_hours = pricing.actualHours
      fields.price = pricing.priceCents
      fields.team_member_pay = pricing.cleanerPayCents
    }

    const { data, error } = await db
      .from('bookings')
      .update(fields)
      .eq('id', id)
      .select('*, clients(name, phone, address, email), team_members!bookings_team_member_id_fkey(name, phone, pin)')
      .single()

    if (error) {
      // Root-caused 2026-08-14: the "invalid input syntax for type uuid: ''"
      // failures came from BookingsAdmin.tsx sending '' instead of null for
      // an unset referrer_id/sales_partner_id on single-booking edits (fixed
      // in that file's updateData). Full details stay server-side only --
      // the client alert() showing raw Postgres text plus the whole fields
      // payload (booking notes, client IP, user agent) was unreadable to
      // non-engineers and needlessly exposed that payload in the browser.
      console.error('[PUT /api/bookings/[id]] update failed', { bookingId: id, fields, error: error.message })
      const friendlyError = error.message.includes('invalid input syntax for type uuid')
        ? 'One of the selected options (referrer, sales partner, team member, or address) has an invalid value. Try clearing and reselecting it, then save again.'
        : 'Could not save this booking. Please try again, and let support know if it keeps happening.'
      return NextResponse.json({ error: friendlyError }, { status: 500 })
    }

    // Same shared payout trigger the team-portal checkout button uses — the
    // admin dashboard's own Check Out button is a second, independent
    // surface that sets check_out_time, and was silently paying nobody
    // (Jeff, 2026-08-07: "same Stripe event trigger" regardless of which
    // screen checks the job out).
    if (fields.check_out_time && assignedMemberId) {
      const checkoutClientName = (data.clients as unknown as { name?: string | null } | null)?.name ?? null
      await payCleanerAtCheckout({
        tenantId,
        bookingId: id,
        teamMemberId: assignedMemberId,
        teamMemberPayCents: (fields.team_member_pay as number | null) ?? null,
        teamMember: checkoutMember,
        clientName: checkoutClientName,
        isLead: true,
      }).catch((err) => console.error('[PUT /api/bookings/[id]] payCleanerAtCheckout failed:', err))
      // Any additional crew on a multi-cleaner job (booking_team_members) gets
      // paid too, same as the team-portal checkout route — added 2026-08-07,
      // extras were never paid by either checkout surface before.
      await payExtraCrewAtCheckout({
        tenantId,
        bookingId: id,
        leadTeamMemberId: assignedMemberId,
        checkInIso: oldBooking?.check_in_time as string,
        checkOutIso: fields.check_out_time as string,
        hourlyRate: (fields.hourly_rate as number | null | undefined) ?? oldBooking?.hourly_rate ?? null,
        discountPercent: (fields.discount_percent as number | null | undefined) ?? oldBooking?.discount_percent ?? null,
        oneTimeCreditCents: (fields.one_time_credit_cents as number | null | undefined) ?? oldBooking?.one_time_credit_cents ?? null,
        recurringType: oldBooking?.recurring_type ?? null,
        maxHours: oldBooking?.max_hours ?? null,
        teamSize: (fields.team_size as number | null | undefined) ?? oldBooking?.team_size ?? null,
        clientAddress: (data.clients as unknown as { address?: string | null } | null)?.address ?? null,
        clientName: checkoutClientName,
      }).catch((err) => console.error('[PUT /api/bookings/[id]] payExtraCrewAtCheckout failed:', err))
    }

    // Send notifications based on what changed
    try {
      const { data: tenantData } = await supabaseAdmin
        .from('tenants')
        .select('name, slug, industry, phone, website_url, domain, domain_name, google_place_id, telnyx_api_key, telnyx_phone, resend_api_key, email_from')
        .eq('id', tenantId)
        .single()
      const hasSMS = !!(tenantData?.telnyx_api_key && tenantData?.telnyx_phone)
      const date = naiveToAnchoredDate(data.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' , timeZone: 'UTC' })
      // NYC Maid clients are told a 2-hour arrival window, never an exact
      // time (see time-window.ts — the same rule every SMS template already
      // follows). Other tenants get the plain wall-clock time.
      const time = isNycMaid(tenantId)
        ? clientArrivalWindow(data.start_time)
        : naiveToAnchoredDate(data.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' , timeZone: 'UTC' })

      const statusChanged = fields.status && fields.status !== oldBooking?.status
      const memberChanged = fields.team_member_id && fields.team_member_id !== oldBooking?.team_member_id
      const timeChanged = fields.start_time && fields.start_time !== oldBooking?.start_time

      // Booking confirmed (status changed to scheduled) — shared Full Loop
      // template (same content nycmaid's old standalone template had —
      // cleaner photo/rating, PIN, cancellation policy, prep tips — now on
      // shared branding), sent via the global multi-contact fan-out so every
      // recipient on the account hears about the booking, not just the
      // primary contact.
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
        if (data.client_id && tenantData) {
          const { buildBookingConfirmationEmail } = await import('@/lib/notify')
          const { sendClientEmail } = await import('@/lib/client-contacts')
          const html = await buildBookingConfirmationEmail(tenantId, id, {
            clientName: data.clients?.name || 'there',
            serviceName: data.service_type || 'Appointment',
            dateTime: isNycMaid(tenantId) ? `${date}, ${time}` : `${date} at ${time}`,
            whatToExpect: isNycMaid(tenantId) ? ARRIVAL_WINDOW_NOTE : undefined,
          })
          await sendClientEmail({ id: tenantId, ...tenantData }, data.client_id, `Booking Confirmed — ${date}`, html)
            .catch(err => console.error('client confirmation email error:', err))
        }
        if (data.clients?.phone && hasSMS && (await isCommEnabled(tenantId, 'booking_confirmed', 'sms'))) {
          sendSMS({
            to: data.clients.phone,
            body: (await clientSmsTemplatesFor(tenant.tenantId)).bookingConfirmation({ start_time: data.start_time, team_members: data.team_members }),
            telnyxApiKey: tenantData!.telnyx_api_key,
            telnyxPhone: tenantData!.telnyx_phone,
            tenantId,
            bookingId: id,
            smsType: 'booking_confirmation',
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
            tenantId,
            bookingId: id,
            smsType: 'job_assignment',
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
          tenantId,
          bookingId: id,
          smsType: 'reschedule',
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
  // Gated on bookings.edit, not bookings.delete: cancel_series=true below is
  // a soft cancel (status update + one notification), the same action as
  // PATCH .../status — it just also has to touch every future booking in the
  // series, which this endpoint already knows how to do. Only the true
  // hard-delete path further down (no cancel_series, no dependent records)
  // re-checks bookings.delete, so a role with cancel-but-not-delete (e.g.
  // virtual_assistant) can cancel a whole series without gaining the power
  // to permanently, silently delete a booking.
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const db = tenantDb(tenantId)
    const url = new URL(request.url)
    const cancelSeries = url.searchParams.get('cancel_series') === 'true'
    // The frontend has sent this on every batched delete since the recurring-
    // series cancel flow was built (BookingsAdmin.tsx handleCancel: "Cancel
    // first with email, rest skip email"), but nothing here ever read it —
    // every booking in a bulk delete sent its own client email/SMS regardless.
    // Now also the explicit signal for a genuine hard-delete ("Delete" button,
    // as opposed to "Cancel"): the whole point of deleting instead of
    // cancelling is that the client is never told anything happened.
    const skipNotify = url.searchParams.get('skip_email') === 'true'

    // Get booking details before deleting for notifications
    // tenantDb's select() takes a non-literal `columns` param, which widens
    // supabase-js's column-string type inference — cast the narrow-select
    // result to the shape actually selected (see client/bookings for the same gap).
    const { data: booking } = (await db
      .from('bookings')
      .select('*, clients(name, phone, email), team_members!bookings_team_member_id_fkey(name, phone)')
      .eq('id', id)
      .single()) as { data: { client_id: string | null; start_time: string; status?: string | null; service_type?: string | null; schedule_id?: string | null; clients: { name?: string | null; phone?: string | null; email?: string | null } | null } | null }

    if (!booking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // cancel_series=true (BookingsAdmin.tsx's "Cancel > All future") was never
    // handled here at all -- the frontend sent it, this route silently
    // ignored it and hard-deleted only the single clicked booking, leaving
    // every other future booking in the series (and the schedule itself)
    // showing 'scheduled' forever. Found live 2026-07-26: creating then
    // cancelling a 2-week daily recurring series left all of it scheduled.
    //
    // Cancel (not hard-delete) the schedule + every future scheduled/pending
    // booking on it, this one forward -- soft-cancel avoids the payments/
    // reviews/payouts FK-block entirely and matches DELETE
    // /api/admin/recurring-schedules/[id]'s existing (correct) pattern.
    if (cancelSeries && booking.schedule_id) {
      const { data: cancelledSchedule } = await db
        .from('recurring_schedules')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', booking.schedule_id)
        .select('id')
        .maybeSingle()

      const { data: cancelledBookings, error: cancelErr } = await db
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('schedule_id', booking.schedule_id)
        .in('status', ['scheduled', 'pending'])
        .gte('start_time', booking.start_time)
        .select('id')

      if (cancelErr) {
        return NextResponse.json({ error: cancelErr.message }, { status: 500 })
      }

      if (booking.client_id) {
        await notify({
          tenantId,
          type: 'booking_cancelled',
          title: 'Recurring series cancelled',
          message: 'Your upcoming recurring appointments have been cancelled.',
          channel: 'sms',
          recipientType: 'client',
          recipientId: booking.client_id,
        }).catch((err: unknown) => console.error('cancel_series notify failed:', err))
      }

      await audit({
        tenantId, action: 'booking.batch_updated', entityType: 'booking', entityId: id,
        details: { action: 'series_cancelled', schedule_id: booking.schedule_id, schedule_cancelled: !!cancelledSchedule, bookings_cancelled: cancelledBookings?.length || 0 },
      })

      return NextResponse.json({ success: true, schedule_cancelled: !!cancelledSchedule, bookings_cancelled: cancelledBookings?.length || 0 })
    }

    // Past this point is the real hard-delete — re-check bookings.delete
    // specifically. The top-level gate only guarantees bookings.edit (enough
    // for the cancel_series branch above); a role without bookings.delete
    // must not reach a permanent, unrecoverable, silent-to-the-client delete.
    if (!hasPermission(tenant.role, 'bookings.delete', overridesFor(tenant))) {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    }

    // Delete is destructive and irreversible — payments, reviews, and payouts
    // all reference bookings.id with a blocking (NO ACTION) foreign key, on
    // purpose (financial and review records must never silently vanish with
    // the booking). Check for those first and give a clear, actionable error
    // instead of surfacing Postgres's raw FK-violation message, which is what
    // every "Cancel" click hit before Cancel/Delete were split into separate
    // actions — every booking with any payment/review/payout history failed
    // to delete, with no way to actually cancel it instead.
    const [{ count: paymentCount }, { count: reviewCount }, { count: payoutCount }] = await Promise.all([
      (await tenantClient(tenantId)).from('payments').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('booking_id', id),
      db.from('reviews').select('id', { count: 'exact', head: true }).eq('booking_id', id),
      db.from('team_member_payouts').select('id', { count: 'exact', head: true }).eq('booking_id', id),
    ])
    if ((paymentCount || 0) > 0 || (reviewCount || 0) > 0 || (payoutCount || 0) > 0) {
      return NextResponse.json({
        error: 'This booking has payment, review, or payout history and can\'t be deleted. Use Cancel instead.',
        code: 'has_dependent_records',
      }, { status: 409 })
    }

    const { error } = await db
      .from('bookings')
      .delete()
      .eq('id', id)

    // Guardrail (Jeff, 2026-08-17, after the Simon Dolsten / Liza Bradburn
    // incidents): a booking that was still active (scheduled/pending) when
    // it got hard-deleted is a data-loss signal, not routine cleanup -- a
    // correctly-cancelled booking is 'cancelled' by the time it ever reaches
    // this path. Always both Telegram AND email, deliberately bypassing
    // notify()'s normal Telegram-exclusive routing ladder.
    if (!error && (booking.status === 'scheduled' || booking.status === 'pending')) {
      alertActiveBookingHardDeleted({
        tenantId,
        bookingId: id,
        clientName: booking.clients?.name,
        startTime: booking.start_time,
        status: booking.status,
      }).catch((err: unknown) => console.error('alertActiveBookingHardDeleted failed:', err))
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send cancellation notifications — skipped entirely for a silent delete
    // (skip_email=true). This is a hard DELETE, not the /status cancel path;
    // "the client never finds out" is the whole point of using this over Cancel.
    if (booking && !skipNotify) {
      try {
        const { data: tenantData } = await supabaseAdmin
          .from('tenants')
          .select('name, telnyx_api_key, telnyx_phone')
          .eq('id', tenantId)
          .single()
        const bizName = tenantData?.name || 'Your Business'
        const hasSMS = !!(tenantData?.telnyx_api_key && tenantData?.telnyx_phone)

        // Client cancellation email — nycmaid gets the rich branded template
        if (booking.client_id) {
          const date = naiveToAnchoredDate(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' , timeZone: 'UTC' })
          if (isNycMaid(tenantId) && booking.clients?.email) {
            const { clientCancellationEmail } = await import('@/lib/nycmaid/email-templates')
            const { sendClientEmail } = await import('@/lib/nycmaid/client-contacts')
            const email = clientCancellationEmail(booking)
            await sendClientEmail(booking.client_id, email.subject, email.html).catch(() => {})
            await supabaseAdmin.from('notifications').insert({
              tenant_id: tenantId,
              type: 'booking_cancelled',
              title: email.subject,
              message: `Cancellation email sent to ${booking.clients.email}`,
              channel: 'email',
              recipient_type: 'client',
              recipient_id: booking.client_id,
              // No booking_id — the booking row is already deleted by this point
              // (DELETE runs before this notification), so any booking_id here
              // would violate notifications_booking_id_fkey on INSERT and get
              // silently swallowed by the .then() no-op handlers below.
              status: 'sent',
              metadata: { clientName: booking.clients?.name },
            }).then(() => {}, () => {})
          } else {
            await notify({
              tenantId,
              type: 'booking_cancelled',
              title: `Booking Cancelled — ${date}`,
              message: `Your appointment on ${date} has been cancelled.`,
              channel: 'email',
              recipientType: 'client',
              recipientId: booking.client_id,
              // No bookingId — same dangling-FK reason as above.
              metadata: { clientName: booking.clients?.name, serviceName: booking.service_type },
            })
          }
        }

        // Client cancellation SMS
        if (booking.clients?.phone && hasSMS && (await isCommEnabled(tenantId, 'cancellation', 'sms'))) {
          sendSMS({
            to: booking.clients.phone,
            body: (await clientSmsTemplatesFor(tenant.tenantId)).cancellation({ start_time: booking.start_time }),
            telnyxApiKey: tenantData!.telnyx_api_key,
            telnyxPhone: tenantData!.telnyx_phone,
            tenantId,
            // No bookingId — the row is already deleted by this point (same
            // FK reason as the notifications insert above).
            smsType: 'cancellation',
          }).catch(err => console.error('Cancellation SMS error:', err))
        }
      } catch (notifErr) {
        console.error('Cancellation notification error:', notifErr)
        await logCommsFail({
          tenantId,
          title: 'Cancellation notification failed',
          message: notifErr instanceof Error ? `${notifErr.message}\n${notifErr.stack}` : String(notifErr),
          channel: 'email',
          status: 'failed',
        })
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
