import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateRecurringDates, nextOccurrenceDates, type RecurringType } from '@/lib/recurring'
import { worksScheduledDay, slotWithinHours } from '@/lib/day-availability'
import { getSettings } from '@/lib/settings'
import { getBookingAddress } from '@/lib/client-properties'
import { scoreTeamForBooking, pickBestTeam } from '@/lib/smart-schedule'
import { suggestTeamMemberForRecurring } from '@/lib/recurring-team-suggest'
import { NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'
import { sendSMS } from '@/lib/sms'
import { teamSmsTemplates } from '@/lib/messaging/team-sms-resolver'
import { isCommEnabled } from '@/lib/comms-prefs'

// Cache across the whole cron run — the same handful of cleaners get reused
// across many schedules/occurrences within one invocation. Keyed by
// tenant+id (not id alone) since team_members is tenant-owned.
const teamMemberContactCache = new Map<string, { name: string | null; phone: string | null; pin: string | null }>()
async function getTeamMemberContact(tenantId: string, id: string) {
  const cacheKey = `${tenantId}:${id}`
  if (teamMemberContactCache.has(cacheKey)) return teamMemberContactCache.get(cacheKey)!
  const { data } = await supabaseAdmin.from('team_members').select('name, phone, pin').eq('id', id).eq('tenant_id', tenantId).single()
  const contact = { name: data?.name ?? null, phone: data?.phone ?? null, pin: data?.pin ?? null }
  teamMemberContactCache.set(cacheKey, contact)
  return contact
}

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
    // No prior booking for this schedule at all → this is the schedule's very
    // first generation run. The cleaner has never been told about this
    // standing job yet, unlike every subsequent weekly top-up of a job they
    // already know about — see the notify-decision below.
    const isFirstGeneration = !latest || latest.length === 0
    const fourWeeksOut = new Date()
    fourWeeksOut.setDate(fourWeeksOut.getDate() + 28)

    if (lastDate >= fourWeeksOut) continue // Already generated enough

    if (schedule.preferred_time) {
      const [h, m] = schedule.preferred_time.split(':')
      lastDate.setHours(parseInt(h), parseInt(m), 0, 0)
    }

    // nextOccurrenceDates anchors on lastOccurrence itself and drops its own
    // echo of that date (see its docstring in lib/recurring.ts) -- anchoring
    // on lastDate + 1 day here (the old code) made every refill's first
    // generated date land exactly 1 day after the real last visit instead of
    // a full interval after, and since every following date steps a fixed
    // interval off THAT one, a weekly Monday visit's refill batch kept
    // sliding one weekday later every single time the 4-week buffer topped
    // up. This was written and tested but never actually wired into this
    // cron -- fixing that now.
    const dates = nextOccurrenceDates({
      recurringType: schedule.recurring_type as RecurringType,
      lastOccurrence: lastDate,
      dayOfWeek: schedule.day_of_week ?? undefined,
      count: 8, // generous upper bound; filtered below to the real 4-week horizon
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

    // Client name + tenant SMS config — invariant across every occurrence
    // this schedule generates, fetched once per schedule rather than per date.
    const { data: clientRow } = await supabaseAdmin
      .from('clients')
      .select('name')
      .eq('id', schedule.client_id)
      .eq('tenant_id', schedule.tenant_id)
      .single()
    const clientName = clientRow?.name || 'Client'
    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('slug, industry, name, phone, website_url, domain, domain_name, google_place_id, telnyx_api_key, telnyx_phone')
      .eq('id', schedule.tenant_id)
      .single()
    const hasSMS = !!(tenantData?.telnyx_api_key && tenantData?.telnyx_phone)
    let notifiedFirstOccurrence = false

    // Fires the same job-assignment SMS the manual create/reassign paths send,
    // logging sent/failed/skipped to `notifications` the same way — this cron
    // previously assigned team_member_id on every generated occurrence with
    // zero notification of any kind, so a cleaner's very first standing job
    // (or a one-off reassignment) never told them.
    async function notifyAssignment(bookingId: string, startTimeISO: string, memberId: string) {
      const member = await getTeamMemberContact(schedule.tenant_id, memberId)
      const skipReason = !member.phone
        ? 'no phone on file'
        : !hasSMS
          ? 'tenant SMS not configured'
          : null
      if (skipReason || !(await isCommEnabled(schedule.tenant_id, 'team_assignment', 'sms'))) {
        await supabaseAdmin.from('notifications').insert({
          tenant_id: schedule.tenant_id,
          type: 'team_assignment',
          title: 'Job Assignment SMS Skipped',
          message: `${member.name || 'Team member'} was NOT notified of recurring assignment to ${clientName}: ${skipReason || 'team_assignment SMS disabled in comms settings'}`,
          channel: 'sms', recipient_type: 'team_member', recipient_id: memberId,
          booking_id: bookingId, status: 'skipped',
        }).then(() => {}, () => {})
        return
      }
      try {
        await sendSMS({
          to: member.phone!,
          body: teamSmsTemplates(tenantData || {}).jobAssignment({
            start_time: startTimeISO,
            hourly_rate: schedule.hourly_rate,
            clients: { name: clientName },
            team_members: { name: member.name, pin: member.pin },
          }),
          telnyxApiKey: tenantData!.telnyx_api_key!,
          telnyxPhone: tenantData!.telnyx_phone!,
        })
        await supabaseAdmin.from('notifications').insert({
          tenant_id: schedule.tenant_id,
          type: 'team_assignment',
          title: 'Job Assignment SMS Sent',
          message: `${member.name || 'Team member'} notified of recurring assignment to ${clientName}`,
          channel: 'sms', recipient_type: 'team_member', recipient_id: memberId,
          booking_id: bookingId, status: 'sent',
        }).then(() => {}, () => {})
      } catch (err) {
        await supabaseAdmin.from('notifications').insert({
          tenant_id: schedule.tenant_id,
          type: 'team_assignment',
          title: 'Job Assignment SMS Failed',
          message: `${member.name || 'Team member'} was NOT notified of recurring assignment to ${clientName}: ${err instanceof Error ? err.message : String(err)}`,
          channel: 'sms', recipient_type: 'team_member', recipient_id: memberId,
          booking_id: bookingId, status: 'failed',
        }).then(() => {}, () => {})
      }
    }

    const durH = schedule.duration_hours || 3

    // Validate the recurring member's availability per generated date (canonical
    // resolver). If they're off / out-of-hours that date, keep the recurring
    // commitment but create it UNASSIGNED + flagged, so it surfaces as actionable
    // "needs reassignment" instead of a false standing assignment. (Day/hours/
    // day-off only — keyed on the ET date + preferred_time so it's TZ-safe; the
    // conflict/max-jobs sub-check is enforced at manual assignment, not here.)
    let mem: { name?: string; working_days?: string[] | null; schedule?: Record<string, unknown> | null; unavailable_dates?: string[] | null; status?: string | null } | null = null
    if (schedule.team_member_id) {
      const { data } = await supabaseAdmin
        .from('team_members')
        .select('name, working_days, schedule, unavailable_dates, status')
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
      // A deactivated member stays wired via schedule.team_member_id forever
      // otherwise — this check only ever verified hours/days/buffer, never
      // whether the assigned member is still active. The smartAssign path's
      // own scoreTeamForBooking query already filters status != 'inactive';
      // this brings the legacy (default) path to the same standard.
      if (mem.status === 'inactive') return false
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
    // Parallel to `bookings` by index — the member id to notify for that
    // occurrence, or null to skip. Kept out of the insert payload itself.
    const notifyPlan: (string | null)[] = []
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
      const isReassignment = ex?.type === 'reassign'
      if (isReassignment) {
        assignedId = ex.new_team_member_id ?? null
        unassignedNote = null
      }

      // Notify-worthy: the schedule's very first-ever occurrence (the cleaner
      // has never heard about this standing job — send once per schedule,
      // not once per each of the up-to-8-dates-ahead first batch), an
      // explicit one-off reassignment, or smart-assign picking someone other
      // than the schedule's usual member for this date. A routine weekly
      // top-up assigning the SAME member the cleaner already expects does
      // NOT notify — that would be a new SMS every single week for a
      // standing job, not a real "new job assigned" event.
      const isSmartSwitch = smartAssign && !!assignedId && assignedId !== schedule.team_member_id
      const isFirstEverOccurrence = isFirstGeneration && !notifiedFirstOccurrence
      const shouldNotify = !!assignedId && (isReassignment || isSmartSwitch || isFirstEverOccurrence)
      if (shouldNotify && isFirstEverOccurrence) notifiedFirstOccurrence = true
      notifyPlan.push(shouldNotify ? assignedId : null)

      // Occurrence has nobody assigned (no schedule.team_member_id, or the
      // legacy path found them unavailable, or smartAssign found nobody
      // available) — suggest instead of leaving it with zero recommendation
      // for the life of the schedule. Suggestion only, never auto-assigns
      // (matches the one-time-booking pattern: suggested_team_member_id set,
      // team_member_id stays null, owner approves).
      let suggestedId: string | null = null
      if (!assignedId) {
        suggestedId = await suggestTeamMemberForRecurring({
          tenantId: schedule.tenant_id,
          clientId: schedule.client_id,
          propertyId: schedule.property_id,
          date: dateStr,
          startTime: ex?.type === 'move' && ex.new_start_time ? String(ex.new_start_time).slice(0, 5) : startHHMM(),
          durationHours: durH,
          hourlyRate: schedule.hourly_rate != null ? Number(schedule.hourly_rate) : undefined,
        })
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
        discount_percent: schedule.discount_percent,
        suggested_team_member_id: suggestedId,
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
    const { data: insertedRows, error: batchErr } = await supabaseAdmin.from('bookings').insert(bookings).select('id') // tenant-scope-ok: each row carries tenant_id (schedule.tenant_id)
    if (!batchErr) {
      totalGenerated += bookings.length
      // Best-effort, fire-and-forget — a notify failure must never affect the
      // generation count or block the next schedule. Index-aligned with
      // `bookings`/`notifyPlan`: a single multi-row INSERT's RETURNING
      // preserves input order (no ORDER BY-less reordering trigger here).
      insertedRows?.forEach((row, i) => {
        const memberId = notifyPlan[i]
        if (memberId) notifyAssignment(row.id, String(bookings[i].start_time), memberId).catch(() => {})
      })
    } else {
      let inserted = 0
      const skipped: string[] = []
      for (let i = 0; i < bookings.length; i++) {
        const row = bookings[i]
        const { data: rowData, error: rowErr } = await supabaseAdmin.from('bookings').insert(row).select('id').single() // tenant-scope-ok: row carries tenant_id (schedule.tenant_id)
        if (rowErr) {
          skipped.push(String(row.start_time))
        } else {
          inserted++
          const memberId = notifyPlan[i]
          if (memberId && rowData) notifyAssignment(rowData.id, String(row.start_time), memberId).catch(() => {})
        }
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
