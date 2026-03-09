import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateRecurringDates, type RecurringType } from '@/lib/recurring'

// Weekly cron: auto-generate bookings 4 weeks out
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: schedules } = await supabaseAdmin
    .from('recurring_schedules')
    .select('*')
    .eq('status', 'active')

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ generated: 0 })
  }

  let totalGenerated = 0

  for (const schedule of schedules) {
    // Find the latest booking for this schedule
    const { data: latest } = await supabaseAdmin
      .from('bookings')
      .select('start_time')
      .eq('schedule_id', schedule.id)
      .order('start_time', { ascending: false })
      .limit(1)

    const lastDate = latest?.[0]?.start_time ? new Date(latest[0].start_time) : new Date()
    const fourWeeksOut = new Date()
    fourWeeksOut.setDate(fourWeeksOut.getDate() + 28)

    if (lastDate >= fourWeeksOut) continue // Already generated enough

    const startDate = new Date(lastDate)
    startDate.setDate(startDate.getDate() + 1)
    if (schedule.preferred_time) {
      const [h, m] = schedule.preferred_time.split(':')
      startDate.setHours(parseInt(h), parseInt(m), 0, 0)
    }

    const dates = generateRecurringDates({
      recurringType: schedule.recurring_type as RecurringType,
      startDate,
      dayOfWeek: schedule.day_of_week ?? undefined,
      weeksToGenerate: 4,
    }).filter((d) => d <= fourWeeksOut)

    if (dates.length === 0) continue

    // Get service type name
    let serviceType = null
    if (schedule.service_type_id) {
      const { data: svc } = await supabaseAdmin
        .from('service_types')
        .select('name')
        .eq('id', schedule.service_type_id)
        .single()
      serviceType = svc?.name || null
    }

    const bookings = dates.map((d) => {
      const endTime = new Date(d)
      endTime.setHours(endTime.getHours() + (schedule.duration_hours || 3))
      return {
        tenant_id: schedule.tenant_id,
        client_id: schedule.client_id,
        team_member_id: schedule.team_member_id,
        service_type_id: schedule.service_type_id,
        service_type: serviceType,
        schedule_id: schedule.id,
        start_time: d.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        hourly_rate: schedule.hourly_rate,
        pay_rate: schedule.pay_rate,
        notes: schedule.notes,
        special_instructions: schedule.special_instructions,
      }
    })

    await supabaseAdmin.from('bookings').insert(bookings)
    totalGenerated += bookings.length
  }

  return NextResponse.json({ generated: totalGenerated })
}
