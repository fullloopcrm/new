import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { generateRecurringDates, type RecurringType } from '@/lib/recurring'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('schedules.view')
    if (authError) return authError
    const { tenantId } = tenant

    const { data, error } = await supabaseAdmin
      .from('recurring_schedules')
      .select('*, clients(name), team_members(name)')
      .eq('tenant_id', tenantId)
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

    // Confirm client_id/team_member_id belong to this tenant -- otherwise a
    // foreign id gets its name pulled into this schedule (and every generated
    // booking) via the clients()/team_members() joins on GET, a cross-tenant
    // PII leak (same class already fixed on bookings/quotes/deals).
    const { data: clientRow } = await supabaseAdmin
      .from('clients').select('id').eq('id', v.client_id as string).eq('tenant_id', tenantId).single()
    if (!clientRow) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    if (v.team_member_id) {
      const { data: memberRow } = await supabaseAdmin
        .from('team_members').select('id, status').eq('id', v.team_member_id as string).eq('tenant_id', tenantId).single()
      if (!memberRow) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      if (memberRow.status === 'inactive') {
        return NextResponse.json({ error: 'Cannot assign an inactive team member' }, { status: 400 })
      }
    }

    // Create schedule
    const { data: schedule, error } = await supabaseAdmin
      .from('recurring_schedules')
      .insert({ ...v, tenant_id: tenantId, status: 'active' })
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

    // Look up service type name
    let serviceType = null
    if (v.service_type_id) {
      const { data: svc } = await supabaseAdmin
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
        tenant_id: tenantId,
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

    let bookingsCreated = 0
    if (bookings.length > 0) {
      const { data: insertedBookings, error: batchError } = await supabaseAdmin
        .from('bookings')  // tenant-scope-ok: insert bookings carry tenant_id (built above)
        .insert(bookings)
        .select('id')
      if (batchError) {
        // Roll back the schedule so a retry doesn't leave this orphaned
        // 'active' row (zero bookings) behind -- e.g. fn_block_booking_overlap
        // rejecting the whole statement on one occurrence. Same failure mode
        // already fixed on admin/recurring-schedules and sale-to-recurring.ts
        // (5b173982); this sibling route was missed by that pass.
        await supabaseAdmin.from('recurring_schedules').delete().eq('id', schedule.id)
        return NextResponse.json({ error: batchError.message }, { status: 500 })
      }
      bookingsCreated = insertedBookings?.length || 0
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
