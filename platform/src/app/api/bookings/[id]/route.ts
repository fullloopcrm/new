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
import { checkBookingDeletable } from '@/lib/booking-delete-guard'

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
    const fields = pick(body, ['client_id', 'team_member_id', 'service_type_id', 'start_time', 'end_time', 'notes', 'special_instructions', 'status', 'hourly_rate', 'pay_rate', 'actual_hours', 'team_pay', 'team_paid', 'team_member_pay', 'team_member_paid', 'discount_enabled', 'price'])

    // client_id/team_member_id are caller-supplied; verify each belongs to this
    // tenant before writing it — the response (and every later GET) joins
    // clients(name, phone, address, email) / team_members(name, phone), so a
    // foreign id would otherwise leak another tenant's PII into this booking.
    if (fields.client_id) {
      const { data: ownedClient } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('id', fields.client_id)
        .single()
      if (!ownedClient) {
        return NextResponse.json({ error: 'Invalid client_id' }, { status: 404 })
      }
    }
    if (fields.team_member_id) {
      const { data: ownedMember } = await supabaseAdmin
        .from('team_members')
        .select('id, status')
        .eq('tenant_id', tenantId)
        .eq('id', fields.team_member_id)
        .single()
      if (!ownedMember) {
        return NextResponse.json({ error: 'Invalid team_member_id' }, { status: 404 })
      }
      if (ownedMember.status === 'inactive') {
        return NextResponse.json({ error: 'Cannot assign an inactive team member' }, { status: 400 })
      }
    }

    // team_member_paid is what GET /api/finance/payroll's claim excludes on
    // (already-settled-out-of-band) and what the payout ledger is keyed
    // against -- flipping it true here (e.g. dashboard/bookings' "Team Paid"
    // toggle recording a manual/cash payment) needs the same paid_at
    // bookkeeping every other paid-flag flip in this codebase gets.
    if (fields.team_member_paid === true) {
      fields.team_member_paid_at = new Date().toISOString()
    }
    // Never let this general-purpose toggle unset team_member_paid once a
    // real payout row exists on file (POST /api/admin/bookings/[id]/cleaner-payout,
    // Stripe auto-payout, team-portal checkout) -- same "forward-only" policy
    // as PATCH .../payment's team_paid->team_member_paid mirror: that payout
    // record is the actual settlement; an accidental un-toggle here re-opens
    // the booking to bulk payroll's claim query and pays it a second time.
    if (fields.team_member_paid === false) {
      const { count } = await supabaseAdmin
        .from('team_member_payouts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('booking_id', id)
      if ((count || 0) > 0) {
        return NextResponse.json(
          { error: 'This job has a real payout on file and cannot be marked unpaid here.' },
          { status: 409 }
        )
      }
    }

    // Mirror the client-portal guard (portal/bookings/[id]/route.ts): once a
    // job is completed/paid, no route should be able to silently flip it
    // back to 'cancelled' — that has no downstream reconciliation (payroll
    // team_pay, referral commission clawback) anywhere in this codebase.
    // The dedicated state machine on PATCH /bookings/[id]/status already
    // blocks this (completed can only advance to paid, never cancelled),
    // and the client portal blocks it too, but this general-purpose PUT
    // accepted `status` as a plain pick()'d field with no such check, so an
    // admin-authenticated PUT could still do it.
    if (fields.status === 'cancelled') {
      const { data: currentBooking } = await supabaseAdmin
        .from('bookings')
        .select('status')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()
      if (currentBooking && ['completed', 'paid'].includes(currentBooking.status)) {
        return NextResponse.json(
          { error: `Cannot cancel a booking that is already ${currentBooking.status}` },
          { status: 400 }
        )
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

    // Atomic claim per notification-triggering field: two concurrent PUTs
    // carrying the same target status/team_member_id/start_time (double-
    // click on "Confirm"/"Reassign"/"Reschedule", a client retry, two admin
    // tabs) previously both read the prior values via a separate SELECT
    // BEFORE either write landed, so both concluded "this is a real change"
    // and both fired the client confirmation email/SMS, the team member
    // assignment SMS, or the reschedule SMS — a real duplicate-message cost,
    // same TOCTOU shape already fixed on jobs status transitions. A `neq`
    // conditional UPDATE per field means only the request that actually
    // flips that field can claim it; the loser's UPDATE matches 0 rows and
    // does not notify. Values are also applied in the final combined update
    // below regardless (harmless no-op re-write for the loser).
    let statusChanged = false
    let memberChanged = false
    let timeChanged = false
    if (fields.status !== undefined) {
      // This claim write also mutates `status` directly (not just a probe) —
      // without the same completed/paid exclusion as the guarded final write
      // below, a race landing here could flip a since-completed booking's
      // status to 'cancelled' right here, before the final write ever runs.
      // (Deliberately excludes only completed/paid, not cancelled itself --
      // this claim's own successful write passes status through 'cancelled'
      // as an expected intermediate value before the final write below reads
      // it, so excluding 'cancelled' too would make the final write falsely
      // reject its own preceding claim as if it were a race.)
      const statusClaimBase = supabaseAdmin
        .from('bookings')
        .update({ status: fields.status })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .neq('status', fields.status)
      const statusClaimQuery = fields.status === 'cancelled'
        ? statusClaimBase.not('status', 'in', '(completed,paid)')
        : statusClaimBase
      const { data: won } = await statusClaimQuery
        .select('id')
        .maybeSingle()
      statusChanged = !!won
    }
    if (fields.team_member_id !== undefined) {
      const { data: won } = await supabaseAdmin
        .from('bookings')
        .update({ team_member_id: fields.team_member_id })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .neq('team_member_id', fields.team_member_id)
        .select('id')
        .maybeSingle()
      memberChanged = !!won
    }
    if (fields.start_time !== undefined) {
      const { data: won } = await supabaseAdmin
        .from('bookings')
        .update({ start_time: fields.start_time })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .neq('start_time', fields.start_time)
        .select('id')
        .maybeSingle()
      timeChanged = !!won
    }

    // Atomic re-check: the cancellation guard above read currentBooking from a
    // plain SELECT snapshot taken before this write. A concurrent transition
    // (checkout, cron auto-complete, no-show) landing in the gap between that
    // read and this update would otherwise still let the cancel through,
    // silently corrupting a since-settled booking with no refund/payroll
    // reconciliation. Mirrors the atomic-claim guard already applied to
    // team-portal/jobs/reassign, client/reschedule/[id], and portal/bookings/[id]
    // for the same race.
    const baseUpdate = supabaseAdmin
      .from('bookings')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
    const updateQuery = fields.status === 'cancelled'
      ? baseUpdate.not('status', 'in', '(completed,paid)')
      : baseUpdate

    const { data, error } = await updateQuery
      .select('*, clients(name, phone, address, email, sms_consent, do_not_service), team_members!bookings_team_member_id_fkey(name, phone, sms_consent)')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Update failed — booking state changed' }, { status: 409 })
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
        // Gated on sms_consent + do_not_service — this path called sendSMS()
        // directly instead of going through notify-team.ts/payment-
        // processor.ts's consent gate, so a client who'd replied STOP (or
        // been flagged do_not_service) still got these texts.
        if (data.clients?.phone && data.clients.sms_consent !== false && !data.clients.do_not_service && hasSMS) {
          sendSMS({
            to: data.clients.phone,
            body: (await clientSmsTemplatesFor(tenant.tenantId)).bookingConfirmation({ start_time: data.start_time, team_members: data.team_members }),
            telnyxApiKey: tenantData!.telnyx_api_key,
            telnyxPhone: tenantData!.telnyx_phone,
          }).catch(err => console.error('Confirm SMS error:', err))
        }
      }

      // Team member assigned/reassigned
      if (memberChanged && data.team_members?.phone && data.team_members.sms_consent !== false && hasSMS) {
        sendSMS({
          to: data.team_members.phone,
          body: smsJobAssignment(bizName, { start_time: data.start_time, clients: data.clients }),
          telnyxApiKey: tenantData!.telnyx_api_key,
          telnyxPhone: tenantData!.telnyx_phone,
        }).catch(err => console.error('Assignment SMS error:', err))
      }

      // Rescheduled
      if (timeChanged && data.clients?.phone && data.clients.sms_consent !== false && !data.clients.do_not_service && hasSMS) {
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

    const guard = await checkBookingDeletable(tenantId, id)
    if (!guard.deletable) {
      return NextResponse.json({ error: guard.reason }, { status: 409 })
    }

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

        // Client cancellation SMS — gated on sms_consent + do_not_service,
        // same reasoning as the confirm/assign/reschedule sends above.
        if (booking.clients?.phone && booking.clients.sms_consent !== false && !booking.clients.do_not_service && hasSMS) {
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
