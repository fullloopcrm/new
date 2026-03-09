import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { generateRecurringDates, type RecurringType } from '@/lib/recurring'
import { validate } from '@/lib/validate'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

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
    const { tenantId } = await getTenantForRequest()
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

    if (bookings.length > 0) {
      await supabaseAdmin.from('bookings').insert(bookings)
    }

    return NextResponse.json({ schedule, bookingsCreated: bookings.length }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
