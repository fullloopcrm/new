import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { generateRecurringDates, type RecurringType } from '@/lib/recurring'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
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
    const { tenantId } = await getTenantForRequest()
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

    const bookings = dates.map((d) => {
      const endTime = new Date(d)
      endTime.setHours(endTime.getHours() + ((v.duration_hours as number) || 3))
      return {
        client_id: v.client_id,
        team_member_id: v.team_member_id || null,
        service_type_id: v.service_type_id || null,
        service_type: serviceTypeName,
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

    if (bookings.length > 0) {
      await db.from('bookings').insert(bookings)  // tenantDb stamps tenant_id on every row
    }

    await audit({ tenantId, action: 'schedule.created', entityType: 'schedule', entityId: schedule.id, details: { recurring_type: v.recurring_type, bookingsCreated: bookings.length } })

    return NextResponse.json({ schedule, bookingsCreated: bookings.length }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
