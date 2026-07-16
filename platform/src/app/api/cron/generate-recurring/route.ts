import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { nextOccurrenceDates, type RecurringType } from '@/lib/recurring'
import { worksScheduledDay, slotWithinHours } from '@/lib/day-availability'
import { getSettings } from '@/lib/settings'
import { getBookingAddress } from '@/lib/client-properties'
import { scoreTeamForBooking, pickBestTeam } from '@/lib/smart-schedule'
import { NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'

// Weekly cron: auto-generate bookings 4 weeks out
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  // NYC Maid parity: auto-resume paused schedules whose pause window elapsed
  // (tenant-scoped). Safe no-op if the column/rows don't exist.
  const todayStr = new Date().toISOString().split('T')[0]
  const { data: resumable } = await supabaseAdmin
    .from('recurring_schedules')
    .select('id')
    .eq('tenant_id', NYCMAID_TENANT_ID)
    .eq('status', 'paused')
    .lte('paused_until', todayStr)
  for (const s of resumable || []) {
    await supabaseAdmin
      .from('recurring_schedules')
      .update({ status: 'active', paused_until: null, updated_at: new Date().toISOString() })
      .eq('id', s.id)
  }

  const { data: schedules } = await supabaseAdmin
    .from('recurring_schedules')  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
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

    const anchor = new Date(lastDate)
    if (schedule.preferred_time) {
      const [h, m] = schedule.preferred_time.split(':')
      anchor.setHours(parseInt(h), parseInt(m), 0, 0)
    }

    const dates = nextOccurrenceDates({
      recurringType: schedule.recurring_type as RecurringType,
      lastOccurrence: anchor,
      dayOfWeek: schedule.day_of_week ?? undefined,
      count: 4,
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

    // Smart-assign (per-tenant flag, default OFF). When ON, each occurrence is
    // scored: the schedule's preferred member is kept if available, otherwise the
    // best-scoring available member is assigned, otherwise unassigned + flagged —
    // instead of hard-locking one member and going unassigned the moment they're
    // off. Flag OFF → byte-identical to the prior binary-lock behavior.
    const { smart_recurring_assign: smartAssign } = await getSettings(schedule.tenant_id)
    let jobAddr: { address: string | null; latitude: number | null; longitude: number | null } | null = null
    if (smartAssign) {
      jobAddr = await getBookingAddress({ propertyId: schedule.property_id, clientId: schedule.client_id })
    }
    const startHHMM = (): string => {
      if (schedule.preferred_time) return String(schedule.preferred_time).slice(0, 5)
      const m = startMinForDate(new Date())
      return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    }

    // Per-occurrence exceptions (skip / move / reassign). Empty table → no effect.
    const { data: exRows } = await supabaseAdmin
      .from('recurring_exceptions')
      .select('occurrence_date, type, new_start_time, new_team_member_id')
      .eq('tenant_id', schedule.tenant_id)
      .eq('schedule_id', schedule.id)
    const exMap = new Map<string, { type: string; new_start_time: string | null; new_team_member_id: string | null }>(
      (exRows || []).map((e) => [String(e.occurrence_date), e as { type: string; new_start_time: string | null; new_team_member_id: string | null }])
    )

    const bookings: Record<string, unknown>[] = []
    for (const d of dates) {
      const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      const ex = exMap.get(dateStr)
      if (ex?.type === 'skip') continue // occurrence cancelled — don't materialize it

      // 'move' shifts this occurrence's start; keep the same calendar date.
      const occ = new Date(d)
      if (ex?.type === 'move' && ex.new_start_time) {
        const [mh, mm] = String(ex.new_start_time).split(':').map(Number)
        occ.setHours(mh || 0, mm || 0, 0, 0)
      }
      const endTime = new Date(occ)
      endTime.setHours(endTime.getHours() + durH)

      let assignedId: string | null
      let unassignedNote: string | null = null

      if (smartAssign) {
        const scores = await scoreTeamForBooking({
          tenantId: schedule.tenant_id,
          date: dateStr,
          startTime: ex?.type === 'move' && ex.new_start_time ? String(ex.new_start_time).slice(0, 5) : startHHMM(),
          durationHours: durH,
          clientAddress: jobAddr?.address || '',
          clientId: schedule.client_id,
          hourlyRate: schedule.hourly_rate != null ? Number(schedule.hourly_rate) : undefined,
          jobCoords: jobAddr?.latitude != null && jobAddr?.longitude != null
            ? { lat: Number(jobAddr.latitude), lng: Number(jobAddr.longitude) }
            : undefined,
        })
        const preferredStillFits = schedule.team_member_id
          ? scores.find((s) => s.id === schedule.team_member_id && s.available)
          : null
        const chosen = preferredStillFits || pickBestTeam(scores, 1).lead
        assignedId = chosen?.id ?? null
        if (!assignedId) unassignedNote = `[Auto: no available team member for ${dateStr} — needs assignment]`
      } else {
        const canTake = memberCanTake(d)
        assignedId = canTake ? schedule.team_member_id : null
        if (!assignedId && schedule.team_member_id) {
          unassignedNote = `[Auto: ${mem?.name || 'assigned member'} unavailable this date — needs reassignment]`
        }
      }

      // 'reassign' exception pins a specific member for this date, overriding both paths.
      if (ex?.type === 'reassign') {
        assignedId = ex.new_team_member_id ?? null
        unassignedNote = null
      }

      bookings.push({
        tenant_id: schedule.tenant_id,
        client_id: schedule.client_id,
        property_id: schedule.property_id || null,
        team_member_id: assignedId,
        service_type_id: schedule.service_type_id,
        service_type: serviceType,
        schedule_id: schedule.id,
        start_time: occ.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        hourly_rate: schedule.hourly_rate,
        pay_rate: schedule.pay_rate,
        notes: unassignedNote
          ? `${schedule.notes ? schedule.notes + ' — ' : ''}${unassignedNote}`
          : schedule.notes,
        special_instructions: schedule.special_instructions,
      })
    }

    // The fn_block_booking_overlap trigger fires BEFORE INSERT. A single
    // overlapping occurrence aborts the WHOLE batch statement, so a batch insert
    // could silently drop every occurrence for this schedule. Check the error and,
    // on failure, fall back to per-row inserts so non-conflicting occurrences still
    // land — and surface the ones that couldn't instead of reporting a false count.
    const { error: batchErr } = await supabaseAdmin.from('bookings').insert(bookings) // tenant-scope-ok: each row carries tenant_id (schedule.tenant_id)
    if (!batchErr) {
      totalGenerated += bookings.length
    } else {
      let inserted = 0
      const skipped: string[] = []
      for (const row of bookings) {
        const { error: rowErr } = await supabaseAdmin.from('bookings').insert(row) // tenant-scope-ok: row carries tenant_id (schedule.tenant_id)
        if (rowErr) skipped.push(String(row.start_time)); else inserted++
      }
      totalGenerated += inserted
      if (skipped.length > 0) {
        await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
          type: 'recurring_generation_conflict',
          title: 'cron:generate-recurring skipped occurrences',
          message: `schedule ${schedule.id}: ${skipped.length} occurrence(s) skipped (overlap/insert error) — needs manual scheduling`,
          channel: 'system',
          recipient_type: 'admin',
        }).then(() => {}, () => {})
      }
    }
  }

  // Health-monitor marker.
  await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    type: 'recurring_generated',
    title: 'cron:generate-recurring',
    message: `generated=${totalGenerated}`,
    channel: 'system',
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return NextResponse.json({ generated: totalGenerated })
}
