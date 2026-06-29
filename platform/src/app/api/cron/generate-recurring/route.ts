import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateRecurringDates, type RecurringType } from '@/lib/recurring'
import { worksScheduledDay, slotWithinHours } from '@/lib/day-availability'

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

    const durH = schedule.duration_hours || 3

    // Validate the recurring member's availability per generated date (canonical
    // resolver). If they're off / out-of-hours that date, keep the recurring
    // commitment but create it UNASSIGNED + flagged, so it surfaces as actionable
    // "needs reassignment" instead of a false standing assignment. (Day/hours/
    // day-off only — keyed on the ET date + preferred_time so it's TZ-safe; the
    // conflict/max-jobs sub-check is enforced at manual assignment, not here.)
    let mem: { name?: string; working_days?: string[] | null; schedule?: Record<string, unknown> | null; unavailable_dates?: string[] | null } | null = null
    if (schedule.team_member_id) {
      const { data } = await supabaseAdmin
        .from('team_members')
        .select('name, working_days, schedule, unavailable_dates')
        .eq('id', schedule.team_member_id)
        .eq('tenant_id', schedule.tenant_id)
        .single()
      mem = data
    }
    const startMinForDate = (d: Date): number => {
      if (schedule.preferred_time) {
        const [h, m] = String(schedule.preferred_time).split(':').map(Number)
        return (h || 0) * 60 + (m || 0)
      }
      const hm = d.toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour12: false })
      const [h, m] = hm.split(':').map(Number)
      return (h || 0) * 60 + (m || 0)
    }
    const memberCanTake = (d: Date): boolean => {
      if (!schedule.team_member_id || !mem) return false
      const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      if (Array.isArray(mem.unavailable_dates) && mem.unavailable_dates.includes(dateStr)) return false
      if (!worksScheduledDay(mem.working_days, mem.schedule, dateStr)) return false
      const startMin = startMinForDate(d)
      return slotWithinHours(mem.schedule, dateStr, startMin, startMin + durH * 60)
    }

    const bookings = dates.map((d) => {
      const endTime = new Date(d)
      endTime.setHours(endTime.getHours() + durH)
      const canTake = memberCanTake(d)
      return {
        tenant_id: schedule.tenant_id,
        client_id: schedule.client_id,
        property_id: schedule.property_id || null,
        team_member_id: canTake ? schedule.team_member_id : null,
        service_type_id: schedule.service_type_id,
        service_type: serviceType,
        schedule_id: schedule.id,
        start_time: d.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        hourly_rate: schedule.hourly_rate,
        pay_rate: schedule.pay_rate,
        notes: canTake
          ? schedule.notes
          : `${schedule.notes ? schedule.notes + ' — ' : ''}[Auto: ${mem?.name || 'assigned member'} unavailable this date — needs reassignment]`,
        special_instructions: schedule.special_instructions,
      }
    })

    await supabaseAdmin.from('bookings').insert(bookings)
    totalGenerated += bookings.length
  }

  // Health-monitor marker.
  await supabaseAdmin.from('notifications').insert({
    type: 'recurring_generated',
    title: 'cron:generate-recurring',
    message: `generated=${totalGenerated}`,
    channel: 'system',
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return NextResponse.json({ generated: totalGenerated })
}
