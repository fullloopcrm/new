import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'
import { checkMemberDayOff } from '@/lib/availability'
import { slotWithinHours, hoursWindowForDate } from '@/lib/day-availability'
import { timestampToMin } from '@/lib/cleaner-availability'
import { notify } from '@/lib/notify'
import { notifyTeamMember } from '@/lib/notify-team-member'
import { sendSMS } from '@/lib/sms'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { teamSmsTemplates } from '@/lib/messaging/team-sms-resolver'
import { getSettings } from '@/lib/settings'
import { applyPropertyToBookingClient } from '@/lib/client-properties'
import { deriveDurationClass } from '@/lib/schedule/duration-class'

function formatMin(min: number): string {
  const h = Math.floor(min / 60), m = min % 60
  const ampm = h >= 12 ? 'PM' : 'AM', hr = h % 12 || 12
  return m > 0 ? `${hr}:${String(m).padStart(2, '0')} ${ampm}` : `${hr} ${ampm}`
}

export async function GET(request: NextRequest) {
  try {
    const { tenant: authTenant, error: authError } = await requirePermission('bookings.view')
    if (authError) return authError
    const { tenantId } = authTenant
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

    let query = tenantDb(tenantId)
      .from('bookings')
      .select('*, clients(name, phone, address), team_members!bookings_team_member_id_fkey(name, phone), client_properties(*)', { count: 'exact' })
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (clientId) query = query.eq('client_id', clientId)
    if (teamMemberId) query = query.eq('team_member_id', teamMemberId)
    if (dateFrom) query = query.gte('start_time', dateFrom)
    if (dateTo) query = query.lte('start_time', dateTo)

    // tenantDb's select() takes a non-literal `columns` param, which widens
    // supabase-js's column-string type inference — cast to the shape actually selected.
    const { data, count, error } = (await query) as {
      data: Record<string, unknown>[] | null
      count: number | null
      error: { message: string } | null
    }

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
    const db = tenantDb(tenantId)
    const body = await request.json()
    const settings = await getSettings(tenantId)

    // price/hourly_rate/service_type/is_emergency were missing from this
    // schema until now: every OTHER booking-creation path (client/book,
    // portal/bookings, all 3 forked selena.ts assistants, selena-legacy,
    // selena/core) sets is_emergency + the tenant's configured emergency_rate
    // on the row, but this route — the one BookingsAdmin.tsx's own
    // "Emergency / Same-Day" manual-create flow posts to — silently dropped
    // all four caller-supplied fields (validate() is a strict allowlist), so
    // an admin-created emergency booking got price=0/hourly_rate=null in the
    // DB regardless of what the operator entered, was never tagged
    // is_emergency, and checkout's `editingBooking.hourly_rate || 69`
    // fallback then silently charged the tenant's default rate instead of
    // the emergency rate. See F4 doc (deploy-prep/) for the sibling
    // same-day-availability gap this pairs with.
    const { data: fields, error: vError } = validate(body, {
      client_id: { type: 'uuid', required: true },
      property_id: { type: 'uuid' },
      team_member_id: { type: 'uuid' },
      service_type_id: { type: 'uuid' },
      service_type: { type: 'string', max: 200 },
      start_time: { type: 'date', required: true },
      end_time: { type: 'date' },
      notes: { type: 'string', max: 2000 },
      special_instructions: { type: 'string', max: 2000 },
      price: { type: 'number', min: 0 },
      hourly_rate: { type: 'number', min: 0 },
      pay_rate: { type: 'number', min: 0 },
      is_emergency: { type: 'boolean' },
    })
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })
    const validated = fields!

    // Confirm every caller-supplied FK belongs to this tenant before it can be
    // joined into the response below or used to fire a real SMS/email --
    // otherwise a foreign client_id/team_member_id leaks that stranger's
    // name/phone/address (or the team member's portal-login pin) via the
    // insert's .select() join, AND triggers a real booking-confirmation /
    // job-assignment SMS to them over this tenant's own Telnyx number
    // (cross-tenant messaging abuse). Same FK-injection class already fixed
    // on quotes/route.ts (client_id/deal_id) and elsewhere this session --
    // runs unconditionally, unlike the day-off/conflict checks below which
    // `force` can bypass, since this is authorization, not scheduling.
    const { data: clientRow } = await db.from('clients').select('id').eq('id', validated.client_id as string).single()
    if (!clientRow) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    if (validated.team_member_id) {
      const { data: memberRow } = await db.from('team_members').select('id').eq('id', validated.team_member_id as string).single()
      if (!memberRow) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    if (validated.property_id) {
      const { data: propRow } = await db.from('client_properties').select('id').eq('id', validated.property_id as string).single()
      if (!propRow) return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    if (validated.service_type_id) {
      const { data: svcRow } = await db.from('service_types').select('id').eq('id', validated.service_type_id as string).single()
      if (!svcRow) return NextResponse.json({ error: 'Service type not found' }, { status: 404 })
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

    // Check for team member scheduling conflicts, honoring booking_buffer_minutes
    // so back-to-back jobs always leave the configured gap.
    if (validated.team_member_id && validated.start_time) {
      const endTime = validated.end_time || new Date(new Date(validated.start_time as string).getTime() + 3 * 3600000).toISOString()
      const bufferMs = Math.max(0, settings.booking_buffer_minutes) * 60_000
      const startWithBuffer = new Date(new Date(validated.start_time as string).getTime() - bufferMs).toISOString()
      const endWithBuffer = new Date(new Date(endTime as string).getTime() + bufferMs).toISOString()

      // tenantDb's select() takes a non-literal `columns` param, which widens
      // supabase-js's column-string type inference — cast to the shape actually selected.
      const { data: conflicts } = (await db
        .from('bookings')
        .select('id, start_time, end_time')
        .eq('team_member_id', validated.team_member_id)
        .not('status', 'in', '("cancelled","no_show")')
        .lt('start_time', endWithBuffer)
        .gt('end_time', startWithBuffer)) as { data: { id: string; start_time: string; end_time: string | null }[] | null }

      if (conflicts && conflicts.length > 0) {
        const bufferNote = bufferMs > 0 ? ` (with ${settings.booking_buffer_minutes} min buffer)` : ''
        return NextResponse.json({
          error: `Scheduling conflict: team member already has a booking during this time${bufferNote}`,
          conflicts: conflicts.map(c => ({
            id: c.id,
            start: c.start_time,
            end: c.end_time,
          }))
        }, { status: 409 })
      }
    }

    // Working-hours + daily max-jobs enforcement at assignment — mirrors the
    // smart-schedule scorer so a manual/agent pick can't violate what suggestions
    // enforce. (force bypasses, like the day-off + conflict guards above.)
    if (validated.team_member_id && validated.start_time && !body.force) {
      const bookingDate = (validated.start_time as string).split('T')[0]
      // tenantDb's select() takes a non-literal `columns` param, which widens
      // supabase-js's column-string type inference — cast to the shape actually selected.
      const { data: member } = (await db
        .from('team_members')
        .select('name, schedule, max_jobs_per_day')
        .eq('id', validated.team_member_id as string)
        .single()) as { data: { name: string; schedule: Record<string, unknown> | null; max_jobs_per_day: number | null } | null }
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
        // Daily job cap.
        if (member.max_jobs_per_day) {
          const { count } = await db
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('team_member_id', validated.team_member_id)
            .gte('start_time', bookingDate + 'T00:00:00')
            .lte('start_time', bookingDate + 'T23:59:59')
            .not('status', 'in', '("cancelled","no_show")')
          if ((count || 0) >= Number(member.max_jobs_per_day)) {
            return NextResponse.json({
              error: `${member.name} is already at their ${member.max_jobs_per_day}-job limit for ${bookingDate}.`,
              unavailable: true, reason: 'max_jobs',
            }, { status: 409 })
          }
        }
      }
    }

    // Look up service type name if service_type_id provided
    if (validated.service_type_id) {
      // tenantDb's select() takes a non-literal `columns` param, which widens
      // supabase-js's column-string type inference — cast to the shape actually selected.
      const { data: svc } = (await db
        .from('service_types')
        .select('name')
        .eq('id', validated.service_type_id as string)
        .single()) as { data: { name: string } | null }
      if (svc) (validated as Record<string, unknown>).service_type = svc.name
    }

    // Status: auto_confirm_bookings overrides everything else; otherwise honor
    // tenant's chosen default_booking_status, falling back to 'scheduled'.
    const newStatus = settings.auto_confirm_bookings
      ? 'confirmed'
      : (settings.default_booking_status || 'scheduled')

    const { data, error } = await db
      .from('bookings')
      .insert({ ...validated, status: newStatus })
      .select('*, clients(name, phone, address, sms_consent), team_members!bookings_team_member_id_fkey(name, phone, pin), client_properties(*)')
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
        .select('name, slug, industry, phone, website_url, domain, domain_name, google_place_id, telnyx_api_key, telnyx_phone')
        .eq('id', tenantId)
        .single()
      const date = new Date(data.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const time = new Date(data.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      const memberName = data.team_members?.name?.split(' ')[0] || 'Your pro'

      // Client confirmation email
      if (data.clients?.phone || true) {
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

      // Client confirmation SMS
      if (data.clients?.phone && data.clients?.sms_consent !== false && tenantData?.telnyx_api_key && tenantData?.telnyx_phone) {
        sendSMS({
          to: data.clients.phone,
          body: (await clientSmsTemplatesFor(tenantId)).bookingConfirmation({ start_time: data.start_time, team_members: data.team_members }),
          telnyxApiKey: tenantData.telnyx_api_key,
          telnyxPhone: tenantData.telnyx_phone,
        }).catch(err => console.error('Client confirmation SMS error:', err))
      }

      // Team member assignment — routed through notifyTeamMember(), the
      // module items (53)/(54)/(56)/(58)/(60)/(62) established as the one
      // true channel for team-member notifications, instead of a raw
      // sendSMS() call. That raw call had no push leg at all (a push-only
      // tech got zero notice of a brand-new assignment), no in-app
      // notification row, no quiet-hours check, and — unlike the client SMS
      // block two lines above it — no sms_consent gate, the item (48) sweep
      // never reached because this call site predates it.
      if (data.team_member_id) {
        await notifyTeamMember({
          tenantId,
          teamMemberId: data.team_member_id,
          type: 'job_assignment',
          title: data.is_emergency ? '🚨 New Emergency Job Assigned' : 'New Job Assigned',
          message: `${data.clients?.name || 'Client'} on ${date} at ${time}`,
          bookingId: data.id,
          smsMessage: tenantData
            ? teamSmsTemplates(tenantData).jobAssignment({ start_time: data.start_time, hourly_rate: data.hourly_rate, pay_rate: data.pay_rate, is_emergency: data.is_emergency, clients: data.clients, team_members: data.team_members })
            : undefined,
          skipEmail: true,
          isEmergency: !!data.is_emergency,
        }).catch(err => console.error('Team assignment notify error:', err))
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
