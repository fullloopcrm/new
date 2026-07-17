import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'
import { checkMemberDayOff } from '@/lib/availability'
import { slotWithinHours, hoursWindowForDate } from '@/lib/day-availability'
import { timestampToMin } from '@/lib/cleaner-availability'
import { notify } from '@/lib/notify'
import { sendSMS } from '@/lib/sms'
import { smsJobAssignment } from '@/lib/sms-templates'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { getSettings } from '@/lib/settings'
import { applyPropertyToBookingClient } from '@/lib/client-properties'
import { deriveDurationClass } from '@/lib/schedule/duration-class'
import { getTerminatedTeamMemberIds } from '@/lib/hr'

function formatMin(min: number): string {
  const h = Math.floor(min / 60), m = min % 60
  const ampm = h >= 12 ? 'PM' : 'AM', hr = h % 12 || 12
  return m > 0 ? `${hr}:${String(m).padStart(2, '0')} ${ampm}` : `${hr} ${ampm}`
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = request.nextUrl
    const status = url.searchParams.get('status')
    const clientId = url.searchParams.get('client_id')
    const teamMemberId = url.searchParams.get('team_member_id')
    const dateFrom = url.searchParams.get('date_from') || url.searchParams.get('from')
    const dateTo = url.searchParams.get('date_to') || url.searchParams.get('to')
    const isRange = !!(dateFrom || dateTo)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || (isRange ? '500' : '50')), isRange ? 1000 : 200)
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('bookings')
      .select('*, clients(name, phone, address), team_members!bookings_team_member_id_fkey(name, phone), client_properties(*)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (clientId) query = query.eq('client_id', clientId)
    if (teamMemberId) query = query.eq('team_member_id', teamMemberId)
    if (dateFrom) query = query.gte('start_time', dateFrom)
    if (dateTo) query = query.lte('start_time', dateTo)

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Render each booking under ITS property's address (multi-address clients),
    // falling back to the client's legacy address when no property is set. Also
    // stamp duration_class (slot/multiday/project) so the multi-view calendar can
    // lane each job without re-deriving client-side; derived when the column is null.
    for (const b of data || []) {
      applyPropertyToBookingClient(b as Parameters<typeof applyPropertyToBookingClient>[0])
      const row = b as { start_time: string; end_time?: string | null; project_id?: string | null; duration_class?: string | null }
      row.duration_class = deriveDurationClass(row)
    }

    return NextResponse.json({ bookings: data, total: count })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.create')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json()
    const settings = await getSettings(tenantId)

    const { data: fields, error: vError } = validate(body, {
      client_id: { type: 'uuid', required: true },
      property_id: { type: 'uuid' },
      team_member_id: { type: 'uuid' },
      service_type_id: { type: 'uuid' },
      start_time: { type: 'date', required: true },
      end_time: { type: 'date' },
      notes: { type: 'string', max: 2000 },
      special_instructions: { type: 'string', max: 2000 },
    })
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })
    const validated = fields!

    // client_id is a caller-supplied FK — verify it belongs to this tenant before
    // any read/write touches it, so a foreign id can't attach another tenant's
    // client to this booking.
    const { data: ownedClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', validated.client_id as string)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!ownedClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // property_id is a caller-supplied FK too — client_properties carries its
    // own tenant_id and no cross-tenant FK check, and is written verbatim to
    // create_admin_booking_atomic's p_property_id with no ownership check on
    // either side (app layer or RPC). GET /api/bookings embeds
    // client_properties(*) unscoped by tenant off this exact column, so a
    // foreign id here leaks another tenant's client address/lat-long on the
    // very next booking list read — same exfil shape as P1/P11/P17. Same
    // guard already applied to POST /api/client/recurring and
    // POST /api/admin/recurring-schedules; this sibling route accepted the
    // id verbatim.
    if (validated.property_id) {
      const { data: ownedProperty } = await supabaseAdmin
        .from('client_properties')
        .select('id')
        .eq('id', validated.property_id as string)
        .eq('client_id', validated.client_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!ownedProperty) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 })
      }
    }

    // team_member_id is a caller-supplied FK too — team_members has no
    // cross-tenant FK check, so without this a foreign id would sail through
    // (the working-hours/cap lookup below silently no-ops when the row isn't
    // found for this tenant, it doesn't reject) and the atomic RPC's row
    // lock doesn't check for a match either — verify ownership here, before
    // `force` or anything downstream can bypass it.
    if (validated.team_member_id) {
      const { data: ownedMember } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('id', validated.team_member_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!ownedMember) {
        return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      }
      // The job-session (project-lane) routes gate this same assignment on
      // hr_status='terminated' (86b797ad) -- this, the PRIMARY booking-create
      // path every non-project tenant uses, never did. A let-go team member
      // could be assigned to a brand-new booking with zero warning.
      const terminatedIds = await getTerminatedTeamMemberIds(tenantId, [validated.team_member_id as string])
      if (terminatedIds.length > 0) {
        return NextResponse.json({ error: 'This team member is no longer active and cannot be assigned.' }, { status: 400 })
      }
    }

    // Tenant rule: require_team_member forces a team_member_id at create time.
    if (settings.require_team_member && !validated.team_member_id) {
      return NextResponse.json(
        { error: 'A team member must be assigned to every booking. Pick one and try again.' },
        { status: 400 }
      )
    }

    // Check if team member has the day off or doesn't work that day
    if (validated.team_member_id && validated.start_time && !body.force) {
      const bookingDate = (validated.start_time as string).split('T')[0]
      const dayOff = await checkMemberDayOff(tenantId, validated.team_member_id as string, bookingDate)
      if (dayOff.unavailable) {
        return NextResponse.json({
          error: dayOff.reason,
          unavailable: true,
        }, { status: 409 })
      }
    }

    // Scheduling-conflict window + daily-cap inputs, computed here but
    // CHECKED atomically below (create_admin_booking_atomic) alongside the
    // INSERT — see migrations/2026_07_13_admin_booking_atomic.sql. Folding a
    // separate SELECT-then-branch here into the same DB call as the insert
    // closes a TOCTOU race: two concurrent creates assigning the same
    // team_member_id could otherwise both read a clean pre-insert state and
    // both pass before either INSERT landed (same shape as
    // migrations/2026_07_13_job_claim_atomic.sql).
    let conflictStart: string | null = null
    let conflictEnd: string | null = null
    let bufferNote = ''
    if (validated.team_member_id && validated.start_time) {
      const endTime = validated.end_time || new Date(new Date(validated.start_time as string).getTime() + 3 * 3600000).toISOString()
      const bufferMs = Math.max(0, settings.booking_buffer_minutes) * 60_000
      conflictStart = new Date(new Date(validated.start_time as string).getTime() - bufferMs).toISOString()
      conflictEnd = new Date(new Date(endTime as string).getTime() + bufferMs).toISOString()
      bufferNote = bufferMs > 0 ? ` (with ${settings.booking_buffer_minutes} min buffer)` : ''
    }

    // Working-hours enforcement at assignment — mirrors the smart-schedule
    // scorer so a manual/agent pick can't violate what suggestions enforce.
    // (force bypasses, like the day-off guard above.) The daily-cap number
    // itself is only captured here (capLimit); the actual count check moves
    // into the atomic call below so it can't race the insert.
    let capLimit: number | null = null
    let capMemberName: string | undefined
    const bookingDate = validated.start_time ? (validated.start_time as string).split('T')[0] : ''
    const dayStart = bookingDate ? `${bookingDate}T00:00:00` : null
    const dayEnd = bookingDate ? `${bookingDate}T23:59:59` : null
    if (validated.team_member_id && validated.start_time && !body.force) {
      const { data: member } = await supabaseAdmin
        .from('team_members')
        .select('name, schedule, max_jobs_per_day')
        .eq('id', validated.team_member_id as string)
        .eq('tenant_id', tenantId)
        .single()
      if (member) {
        const startMin = timestampToMin(validated.start_time as string)
        const endMin = validated.end_time
          ? Math.max(startMin + 30, timestampToMin(validated.end_time as string))
          : startMin + 180
        // Working hours for the day (schedule with no hours set imposes no limit).
        if (!slotWithinHours(member.schedule as Record<string, unknown> | null, bookingDate, startMin, endMin)) {
          const w = hoursWindowForDate(member.schedule as Record<string, unknown> | null, bookingDate)
          return NextResponse.json({
            error: w
              ? `${member.name} works ${formatMin(w.start)}–${formatMin(w.end)} that day — this slot is outside their hours.`
              : `${member.name} is not available at that time.`,
            unavailable: true, reason: 'outside_hours',
          }, { status: 409 })
        }
        if (member.max_jobs_per_day) {
          capLimit = Number(member.max_jobs_per_day)
          capMemberName = member.name as string
        }
      }
    }

    // service_type_id is a caller-supplied FK too — the tenant-scoped lookup
    // below used to only gate whether the NAME got copied onto the booking,
    // but still passed the raw (possibly foreign) id through to the INSERT
    // unconditionally. A foreign id planted here doesn't leak directly off
    // this route, but POST /api/invoices?from_booking_id embeds
    // service_types(name, default_hourly_rate, pricing_model) off this exact
    // FK with no tenant filter on the embedded side — so a dangling foreign
    // service_type_id here becomes a cross-tenant read one hop later. Reject
    // instead of silently keeping the id, same as client_id/team_member_id above.
    if (validated.service_type_id) {
      const { data: svc } = await supabaseAdmin
        .from('service_types')
        .select('name')
        .eq('id', validated.service_type_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!svc) {
        return NextResponse.json({ error: 'Service type not found' }, { status: 404 })
      }
      (validated as Record<string, unknown>).service_type = svc.name
    }

    // Status: auto_confirm_bookings overrides everything else; otherwise honor
    // tenant's chosen default_booking_status, falling back to 'scheduled'.
    const newStatus = settings.auto_confirm_bookings
      ? 'confirmed'
      : (settings.default_booking_status || 'scheduled')

    // Atomic create: the scheduling-conflict check, the daily-cap check, and
    // the INSERT all run inside one supabaseAdmin.rpc('create_admin_booking_atomic', ...)
    // call — see migrations/2026_07_13_admin_booking_atomic.sql.
    const { data: claim, error: claimError } = await supabaseAdmin.rpc('create_admin_booking_atomic', {
      p_tenant_id: tenantId,
      p_client_id: validated.client_id,
      p_property_id: validated.property_id ?? null,
      p_team_member_id: validated.team_member_id ?? null,
      p_service_type_id: validated.service_type_id ?? null,
      p_service_type: (validated as Record<string, unknown>).service_type ?? null,
      p_start_time: validated.start_time,
      p_end_time: validated.end_time ?? null,
      p_notes: validated.notes ?? null,
      p_special_instructions: validated.special_instructions ?? null,
      p_status: newStatus,
      p_conflict_start: conflictStart,
      p_conflict_end: conflictEnd,
      p_day_start: dayStart,
      p_day_end: dayEnd,
      p_max_jobs_per_day: capLimit,
    })
    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 })
    }
    if (!claim?.created) {
      if (claim?.reason === 'conflict') {
        return NextResponse.json({
          error: `Scheduling conflict: team member already has a booking during this time${bufferNote}`,
          conflicts: (claim.conflicts || []).map((c: { id: string; start: string; end: string }) => ({
            id: c.id,
            start: c.start,
            end: c.end,
          })),
        }, { status: 409 })
      }
      if (claim?.reason === 'max_jobs') {
        return NextResponse.json({
          error: `${capMemberName} is already at their ${capLimit}-job limit for ${bookingDate}.`,
          unavailable: true, reason: 'max_jobs',
        }, { status: 409 })
      }
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('*, clients(name, phone, address, sms_consent, do_not_service), team_members!bookings_team_member_id_fkey(name, phone, sms_consent), client_properties(*)')
      .eq('id', claim.booking.id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Render this booking under its property's address (multi-address clients),
    // falling back to the client's legacy address when no property is set.
    applyPropertyToBookingClient(data as Parameters<typeof applyPropertyToBookingClient>[0])

    await audit({ tenantId, action: 'booking.created', entityType: 'booking', entityId: data.id, details: { service: validated.service_type_id } })

    // Send notifications to client + team member
    try {
      const { data: tenantData } = await supabaseAdmin
        .from('tenants')
        .select('name, telnyx_api_key, telnyx_phone')
        .eq('id', tenantId)
        .single()
      const bizName = tenantData?.name || 'Your Business'
      const date = new Date(data.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const time = new Date(data.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      const memberName = data.team_members?.name?.split(' ')[0] || 'Your pro'

      // Client confirmation email — do_not_service is the codebase-wide
      // "NEVER contact" flag, same invariant every other client fan-out
      // enforces; this notify() call fired unconditionally (the `|| true`
      // made the phone check a no-op).
      if (!data.clients?.do_not_service) {
        await notify({
          tenantId,
          type: 'booking_confirmed',
          title: `Booking Confirmed — ${date}`,
          message: `Your appointment on ${date} at ${time} with ${memberName} is confirmed.`,
          channel: 'email',
          recipientType: 'client',
          recipientId: data.client_id,
          bookingId: data.id,
          metadata: { clientName: data.clients?.name, serviceName: data.service_type },
        })
      }

      // Client confirmation SMS — sms_consent (STOP compliance) / do_not_service,
      // same invariant every other client SMS fan-out enforces (payment-processor.ts,
      // client/book, client/reschedule) — this route sent unconditionally on
      // phone presence.
      if (data.clients?.phone && data.clients?.sms_consent !== false && !data.clients?.do_not_service && tenantData?.telnyx_api_key && tenantData?.telnyx_phone) {
        sendSMS({
          to: data.clients.phone,
          body: (await clientSmsTemplatesFor(tenantId)).bookingConfirmation({ start_time: data.start_time, team_members: data.team_members }),
          telnyxApiKey: tenantData.telnyx_api_key,
          telnyxPhone: tenantData.telnyx_phone,
        }).catch(err => console.error('Client confirmation SMS error:', err))
      }

      // Team member assignment SMS — sms_consent (team_members.sms_consent
      // is a real, crew-editable column), same invariant the client SMS
      // right above it enforces; this send fired unconditionally on phone
      // presence before this fix.
      if (data.team_members?.phone && data.team_members?.sms_consent !== false && tenantData?.telnyx_api_key && tenantData?.telnyx_phone) {
        sendSMS({
          to: data.team_members.phone,
          body: smsJobAssignment(bizName, { start_time: data.start_time, clients: data.clients }),
          telnyxApiKey: tenantData.telnyx_api_key,
          telnyxPhone: tenantData.telnyx_phone,
        }).catch(err => console.error('Team assignment SMS error:', err))
      }
    } catch (notifErr) {
      console.error('Booking notification error:', notifErr)
    }

    return NextResponse.json({ booking: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
