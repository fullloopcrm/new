import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { generateRecurringDates, type RecurringType } from '@/lib/recurring'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'
import { scoreTeamForBooking, pickBestTeam } from '@/lib/smart-schedule'
import { getBookingAddress } from '@/lib/client-properties'
import { getSettings } from '@/lib/settings'

export async function GET() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('schedules.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const db = tenantDb(tenantId)

    const { data, error } = await db
      .from('recurring_schedules')
      .select('*, clients(name), team_members(name)')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ schedules: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function POST(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('schedules.create')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const db = tenantDb(tenantId)
    const body = await request.json()

    const { data: fields, error: vError } = validate(body, {
      client_id: { type: 'uuid', required: true },
      team_member_id: { type: 'uuid' },
      service_type_id: { type: 'uuid' },
      recurring_type: { type: 'string', required: true, max: 50 },
      day_of_week: { type: 'number', min: 0, max: 6 },
      preferred_time: { type: 'string', max: 10 },
      duration_hours: { type: 'number', min: 0.5, max: 24 },
      hourly_rate: { type: 'number', min: 0 },
      pay_rate: { type: 'number', min: 0 },
      notes: { type: 'string', max: 2000 },
      special_instructions: { type: 'string', max: 2000 },
    })
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })
    const v = fields!

    // client_id/team_member_id are caller-supplied FKs — tenantDb only stamps
    // tenant_id on the row being inserted, it doesn't validate a referenced id
    // belongs to this tenant, and neither clients nor team_members has a
    // cross-tenant FK check. GET /api/schedules embeds clients(name)/
    // team_members(name) unscoped by tenant off these FKs, and every generated
    // booking below carries the same foreign id, which GET /api/bookings then
    // embeds with full PII (name/phone/address) — same exfil class as the
    // already-fixed POST /api/bookings (client_id) and POST /api/admin/
    // recurring-schedules (team_member_id).
    const { data: ownedClient } = await db.from('clients').select('id').eq('id', v.client_id as string).maybeSingle()
    if (!ownedClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    if (v.team_member_id) {
      const { data: ownedMember } = await db.from('team_members').select('id').eq('id', v.team_member_id as string).maybeSingle()
      if (!ownedMember) {
        return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      }
    }
    // service_type_id is the same shape of FK — checked here (before the
    // schedule/booking inserts below, which both write it verbatim) rather
    // than only gating the name-copy further down, which left the raw id
    // writable regardless. POST /api/invoices?from_booking_id later embeds
    // service_types(name, default_hourly_rate, pricing_model) off a
    // generated booking's service_type_id with no tenant filter on the
    // embedded side, so a dangling foreign id here becomes a cross-tenant
    // read one hop later.
    let serviceTypeName: string | null = null
    if (v.service_type_id) {
      const { data: ownedService } = await db
        .from('service_types')
        .select('name')
        .eq('id', v.service_type_id as string)
        .maybeSingle()
      if (!ownedService) {
        return NextResponse.json({ error: 'Service type not found' }, { status: 404 })
      }
      serviceTypeName = ownedService.name
    }

    // Create schedule
    const { data: schedule, error } = await db
      .from('recurring_schedules')
      .insert({ ...v, status: 'active' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Generate first 4 weeks of bookings
    const startDate = new Date()
    if (v.preferred_time) {
      const [h, m] = (v.preferred_time as string).split(':')
      startDate.setHours(parseInt(h), parseInt(m), 0, 0)
    }
    // Adjust to next occurrence of day_of_week
    if (v.day_of_week !== undefined && v.day_of_week !== null) {
      while (startDate.getDay() !== (v.day_of_week as number)) {
        startDate.setDate(startDate.getDate() + 1)
      }
    }

    const dates = generateRecurringDates({
      recurringType: v.recurring_type as RecurringType,
      startDate,
      dayOfWeek: v.day_of_week as number,
      weeksToGenerate: 4,
    })

    // Per-occurrence availability check -- a single date the requested member
    // is already booked on used to abort the ENTIRE batch (the DB's
    // fn_block_booking_overlap trigger blocks the whole multi-row insert on
    // any one conflicting row), so one Thursday conflict blocked creating the
    // whole weekly schedule. Score each date individually instead: keep the
    // requested member if they're actually free that date, otherwise fall
    // back to the best-scoring available alternate (smart_recurring_assign
    // flag, same semantics as the cron refill) or leave that one occurrence
    // unassigned+flagged for manual review -- never block the others.
    const { smart_recurring_assign: smartAssign } = await getSettings(tenantId)
    const durH = (v.duration_hours as number) || 3
    let jobAddr: { address: string | null; latitude: number | null; longitude: number | null } | null = null
    if (v.team_member_id) {
      jobAddr = await getBookingAddress({ propertyId: null, clientId: v.client_id as string })
    }

    const bookings: Record<string, unknown>[] = []
    for (const d of dates) {
      // Plain local getters, NOT toLocaleDateString/toLocaleTimeString with an
      // explicit America/New_York timeZone. `d` was built via naive Date math
      // (setHours/setDate, no timezone awareness -- same convention as every
      // other recurring date-generation call site), so its LOCAL components
      // already ARE the intended wall-clock digits, self-consistent regardless
      // of the runtime's actual timezone. Converting through an explicit ET
      // Intl call only round-trips correctly when the runtime's local timezone
      // already happens to be America/New_York (true in local dev, NOT true on
      // Vercel, which runs UTC with no TZ override configured) -- on a UTC
      // runtime this silently shifted the conflict-check time by 4-5h,
      // checking e.g. a real 9am booking against 5am and missing/inventing
      // conflicts. Verified directly: `TZ=UTC node` reproduces the skew.
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const startHHMM = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      const endTime = new Date(d)
      endTime.setHours(endTime.getHours() + durH)

      let assignedId: string | null = (v.team_member_id as string) || null
      let unassignedNote: string | null = null

      if (v.team_member_id) {
        const scores = await scoreTeamForBooking({
          tenantId,
          date: dateStr,
          startTime: startHHMM,
          durationHours: durH,
          clientAddress: jobAddr?.address || '',
          clientId: v.client_id as string,
          hourlyRate: v.hourly_rate != null ? Number(v.hourly_rate) : undefined,
          jobCoords: jobAddr?.latitude != null && jobAddr?.longitude != null
            ? { lat: Number(jobAddr.latitude), lng: Number(jobAddr.longitude) }
            : undefined,
        })
        const requestedStillFree = scores.find((s) => s.id === v.team_member_id && s.available)
        if (!requestedStillFree) {
          const alternate = smartAssign ? pickBestTeam(scores, 1).lead : null
          assignedId = alternate?.id ?? null
          unassignedNote = alternate
            ? null
            : `[Auto: requested team member unavailable ${dateStr} — needs reassignment]`
        }
      }

      bookings.push({
        client_id: v.client_id,
        team_member_id: assignedId,
        service_type_id: v.service_type_id || null,
        service_type: serviceTypeName,
        schedule_id: schedule.id,
        start_time: d.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        hourly_rate: v.hourly_rate || null,
        pay_rate: v.pay_rate || null,
        notes: unassignedNote
          ? `${v.notes ? v.notes + ' — ' : ''}${unassignedNote}`
          : (v.notes || null),
        special_instructions: v.special_instructions || null,
        source: 'admin',
      })
    }

    // The fn_block_booking_overlap trigger fires BEFORE INSERT and aborts the
    // whole batch statement on any single conflicting row. The per-occurrence
    // check above should already keep conflicting rows out, but fall back to
    // per-row inserts on any batch error so a conflict slipping through
    // (race condition, stale score) still lands every non-conflicting
    // occurrence instead of silently creating zero bookings while reporting
    // success -- mirrors cron/generate-recurring's existing fallback.
    let bookingsCreated = 0
    const skippedDates: string[] = []
    if (bookings.length > 0) {
      const { error: batchErr } = await db.from('bookings').insert(bookings)  // tenantDb stamps tenant_id on every row
      if (!batchErr) {
        bookingsCreated = bookings.length
      } else {
        for (const b of bookings) {
          const { error: rowErr } = await db.from('bookings').insert(b)
          if (rowErr) skippedDates.push(String(b.start_time))
          else bookingsCreated++
        }
      }
    }

    await audit({ tenantId, action: 'schedule.created', entityType: 'schedule', entityId: schedule.id, details: { recurring_type: v.recurring_type, bookingsCreated, skippedDates } })

    return NextResponse.json({ schedule, bookingsCreated, skippedDates }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
