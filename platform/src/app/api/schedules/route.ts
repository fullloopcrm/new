import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { addCalendarDays, calendarDayOfWeek, etToday, generateRecurringDates, nowNaiveET, type RecurringType } from '@/lib/recurring'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'

// validate.ts has no enum type, so recurring_type is checked by hand here --
// mirrors the guard PUT /api/schedules/[id] already has. Without it, an
// unvalidated recurring_type passes validate()'s bare string/max-50 check,
// gets stored on recurring_schedules, and generateRecurringDates' switch (no
// default case) silently returns zero dates for it forever -- both for this
// route's own initial-batch generation below AND every future cron/
// generate-recurring refill, with no error anywhere.
const VALID_RECURRING_TYPES = ['daily', 'weekly', 'biweekly', 'triweekly', 'monthly_date', 'monthly_weekday', 'custom']

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('schedules.view')
    if (authError) return authError
    const { tenantId } = tenant
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
    const { tenant, error: authError } = await requirePermission('schedules.create')
    if (authError) return authError
    const { tenantId } = tenant
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

    if (!VALID_RECURRING_TYPES.includes(v.recurring_type as string)) {
      return NextResponse.json({ error: `recurring_type must be one of: ${VALID_RECURRING_TYPES.join(', ')}` }, { status: 400 })
    }

    // invoice_consolidation: 'per_visit' (default, standalone invoice per
    // completed booking) or 'monthly' (commercial/office accounts — folded
    // into one rollup statement by cron/generate-monthly-invoices).
    // validate.ts has no enum type, so this is checked by hand.
    if (body.invoice_consolidation !== undefined && !['per_visit', 'monthly'].includes(body.invoice_consolidation)) {
      return NextResponse.json({ error: 'invoice_consolidation must be per_visit or monthly' }, { status: 400 })
    }
    const invoiceConsolidation = body.invoice_consolidation === 'monthly' ? 'monthly' : 'per_visit'

    // Create schedule
    const { data: schedule, error } = await db
      .from('recurring_schedules')
      .insert({ ...v, status: 'active', invoice_consolidation: invoiceConsolidation })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Generate first 4 weeks of bookings.
    // Anchor the day-of-week search to ET's calendar "today" (etToday()), not
    // `new Date()`'s own getDay()/setDate() -- those read the SERVER's local
    // calendar (UTC on Vercel). A schedule created ~8pm-midnight ET, when UTC
    // has already rolled to tomorrow, searched forward from the wrong
    // starting day: a day_of_week that was actually still "today" in ET got
    // skipped entirely, pushing the first occurrence -- and every date after
    // it, since each later date steps a fixed interval off this anchor -- a
    // full week later than intended.
    let anchor = etToday()
    if (v.day_of_week !== undefined && v.day_of_week !== null) {
      while (calendarDayOfWeek(anchor) !== (v.day_of_week as number)) {
        anchor = addCalendarDays(anchor, 1)
      }
    }
    // When no preferred_time is given, fall back to the current ET wall-clock
    // hour/minute (nowNaiveET()), not `new Date().getUTCHours()/getUTCMinutes()`
    // -- those read the true UTC instant's clock digits, which this route then
    // fed straight into Date.UTC() as if they were ET wall-clock digits (the
    // same "impersonate UTC to encode ET" trick anchor/startDate below use
    // correctly). That silently skewed every schedule created without an
    // explicit preferred_time by the ET/UTC gap (4h EDT / 5h EST) -- e.g. a
    // schedule created at 2pm ET (18:00 UTC) got every one of its first 4
    // weeks of bookings stamped 18:00, not 14:00. The sibling admin route
    // (POST /api/admin/recurring-schedules) never had this bug -- it defaults
    // a missing preferred_time to a fixed '09:00' instead of reading any clock.
    const [hh, mm] = v.preferred_time
      ? (v.preferred_time as string).split(':').map((n) => parseInt(n, 10))
      : nowNaiveET().slice(11, 16).split(':').map((n) => parseInt(n, 10))
    const startDate = new Date(Date.UTC(anchor.year, anchor.month, anchor.day, hh, mm, 0, 0))

    const dates = generateRecurringDates({
      recurringType: v.recurring_type as RecurringType,
      startDate,
      dayOfWeek: v.day_of_week as number,
      weeksToGenerate: 4,
    })

    // Look up service type name
    let serviceType = null
    if (v.service_type_id) {
      const { data: svc } = await db
        .from('service_types')
        .select('name')
        .eq('id', v.service_type_id as string)
        .single()
      serviceType = svc?.name || null
    }

    const bookings = dates.map((d) => {
      const endTime = new Date(d)
      endTime.setHours(endTime.getHours() + ((v.duration_hours as number) || 3))
      return {
        client_id: v.client_id,
        team_member_id: v.team_member_id || null,
        service_type_id: v.service_type_id || null,
        service_type: serviceType,
        schedule_id: schedule.id,
        start_time: d.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        hourly_rate: v.hourly_rate || null,
        pay_rate: v.pay_rate || null,
        notes: v.notes || null,
        special_instructions: v.special_instructions || null,
      }
    })

    // The batch insert's error was previously discarded entirely -- the DB's
    // trg_block_booking_overlap trigger (015_booking_overlap_trigger.sql)
    // raises on ANY row in a multi-row INSERT that overlaps an existing
    // booking for that team member, which aborts the WHOLE statement (a
    // single-statement INSERT is atomic), not just the conflicting row. That
    // silently threw away every generated booking while this route still
    // returned 201 with `bookingsCreated: bookings.length` -- the INTENDED
    // count, not the actual one -- so the admin saw "success, N bookings
    // created" for a schedule that in truth had zero bookings behind it,
    // with no indication anything failed. Sibling route POST
    // /api/admin/recurring-schedules already checks this same insert's error;
    // matching that convention here instead of swallowing it.
    let bookingsCreated = 0
    if (bookings.length > 0) {
      const { data: inserted, error: bookingsErr } = await db.from('bookings').insert(bookings).select('id')
      if (bookingsErr) {
        return NextResponse.json({ error: bookingsErr.message, schedule }, { status: 500 })
      }
      bookingsCreated = inserted?.length || 0
    }

    await audit({ tenantId, action: 'schedule.created', entityType: 'schedule', entityId: schedule.id, details: { recurring_type: v.recurring_type, bookingsCreated } })

    return NextResponse.json({ schedule, bookingsCreated }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
