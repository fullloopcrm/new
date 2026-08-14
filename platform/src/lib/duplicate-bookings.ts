// Automated duplicate-booking guardrail (Jeff, 2026-08-14): closes the gap
// left by duplicate-schedule-audit's original cron, which only detected two
// active recurring schedules generating a booking for the same client on the
// same calendar date and sent an admin notification -- nothing ever actually
// resolved the duplicate, so it sat there until a human noticed the alert.
//
// SAME "established wins" direction as client-dedupe.ts's canonical pick:
// between the two colliding bookings, the one whose recurring_schedules row
// is OLDER (earlier created_at -- the more established schedule) is kept;
// the other is auto-cancelled via booking-cancel.ts (full finance/deal-sync
// correctness, no client-facing notify -- the client is still served by the
// surviving booking on that date).
//
// TRUE DUPLICATE requires matching service_type too. A same-date collision
// across two DIFFERENT services (e.g. a standard clean + a one-off carpet
// job the same day) is a legitimate double-booking on purpose, not a
// duplicate -- left exactly as before: admin notification only, no auto-cancel.
import { supabaseAdmin } from './supabase'
import { notify } from './notify'
import { nowNaiveET } from './recurring'
import { applyStatusChangeSideEffects, type BookingForCancel } from './booking-cancel'

const ACTIVE_BOOKING_STATUSES = ['scheduled', 'pending', 'confirmed', 'in_progress']

interface BookingRow {
  id: string
  client_id: string
  schedule_id: string
  service_type: string | null
  start_time: string
  status: string
}

export interface DuplicateBookingGroup {
  tenantId: string
  clientId: string
  clientName: string
  date: string
  bookings: BookingRow[]
}

/** Same collision scan the original audit cron ran -- client_id -> date -> booking rows, flagged when 2+ schedule_ids land on the same date. */
export async function findDuplicateBookingGroups(tenantId: string): Promise<DuplicateBookingGroup[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('bookings')
    .select('id, client_id, schedule_id, service_type, start_time, status, clients(name)')
    .eq('tenant_id', tenantId)
    .in('status', ACTIVE_BOOKING_STATUSES)
    .not('schedule_id', 'is', null)
    // start_time is naive ET -- see cron/duplicate-schedule-audit's own note
    // on the same real-instant-boundary bug this mirrors.
    .gte('start_time', `${nowNaiveET()}Z`)

  if (error) throw new Error(error.message)

  const byClientDate = new Map<string, Map<string, BookingRow[]>>()
  const clientNames = new Map<string, string>()

  for (const b of (rows || []) as Array<BookingRow & { clients: { name?: string } | null }>) {
    const date = b.start_time.split('T')[0]
    clientNames.set(b.client_id, b.clients?.name || 'Unknown')
    if (!byClientDate.has(b.client_id)) byClientDate.set(b.client_id, new Map())
    const dateMap = byClientDate.get(b.client_id)!
    if (!dateMap.has(date)) dateMap.set(date, [])
    dateMap.get(date)!.push({ id: b.id, client_id: b.client_id, schedule_id: b.schedule_id, service_type: b.service_type, start_time: b.start_time, status: b.status })
  }

  const groups: DuplicateBookingGroup[] = []
  for (const [clientId, dateMap] of byClientDate) {
    for (const [date, bookings] of dateMap) {
      const distinctSchedules = new Set(bookings.map((b) => b.schedule_id))
      if (distinctSchedules.size > 1) {
        groups.push({ tenantId, clientId, clientName: clientNames.get(clientId) || 'Unknown', date, bookings })
      }
    }
  }
  return groups
}

export interface ResolveGroupResult {
  autoCancelledBookingIds: string[]
  keptBookingId: string | null
  autoResolved: boolean
  reason: string
}

/**
 * Resolves one client+date collision. Auto-cancels down to a single survivor
 * only when every colliding booking shares the same service_type (the true-
 * duplicate case); otherwise leaves everything untouched for a human (mixed
 * services on the same date is plausibly intentional).
 */
export async function resolveDuplicateBookingGroup(group: DuplicateBookingGroup): Promise<ResolveGroupResult> {
  const serviceTypes = new Set(group.bookings.map((b) => b.service_type || ''))
  if (serviceTypes.size > 1) {
    return { autoCancelledBookingIds: [], keptBookingId: null, autoResolved: false, reason: 'colliding bookings are different services -- needs a human look' }
  }

  const scheduleIds = [...new Set(group.bookings.map((b) => b.schedule_id))]
  const { data: schedules } = await supabaseAdmin
    .from('recurring_schedules')
    .select('id, created_at')
    .in('id', scheduleIds)
  const scheduleCreatedAt = new Map((schedules || []).map((s: { id: string; created_at: string }) => [s.id, s.created_at]))

  // Oldest schedule (earliest created_at) wins -- same "more established
  // record wins" direction as client-dedupe.ts's canonical pick. A schedule
  // missing from the lookup (shouldn't happen, FK-backed) sorts last so it's
  // never mistaken for the established one.
  const sortedScheduleIds = [...scheduleIds].sort((a, b) => {
    const ca = scheduleCreatedAt.get(a) || '9999'
    const cb = scheduleCreatedAt.get(b) || '9999'
    return ca < cb ? -1 : ca > cb ? 1 : 0
  })
  const winningScheduleId = sortedScheduleIds[0]
  const winningBooking = group.bookings.find((b) => b.schedule_id === winningScheduleId)
  const losers = group.bookings.filter((b) => b.schedule_id !== winningScheduleId)

  const cancelledIds: string[] = []
  for (const loser of losers) {
    const { data: fullBooking } = await supabaseAdmin
      .from('bookings')
      .select('status, client_id, start_time, service_type, clients(name, phone, email)')
      .eq('id', loser.id)
      .single()
    if (!fullBooking) continue

    const { error: updateErr } = await supabaseAdmin.from('bookings').update({ status: 'cancelled' }).eq('id', loser.id)
    if (updateErr) continue

    await applyStatusChangeSideEffects({
      tenantId: group.tenantId,
      bookingId: loser.id,
      fromStatus: fullBooking.status,
      toStatus: 'cancelled',
      booking: fullBooking as BookingForCancel,
      notifyClient: false,
      auditAction: 'booking.duplicate_auto_cancelled',
      auditDetails: {
        reason: 'duplicate booking -- same client, same date, same service, from a newer recurring schedule',
        keptBookingId: winningBooking?.id,
        keptScheduleId: winningScheduleId,
        cancelledScheduleId: loser.schedule_id,
        date: group.date,
      },
    })
    cancelledIds.push(loser.id)
  }

  return {
    autoCancelledBookingIds: cancelledIds,
    keptBookingId: winningBooking?.id || null,
    autoResolved: cancelledIds.length > 0,
    reason: 'same service, colliding schedules -- kept the more established schedule\'s booking, cancelled the rest',
  }
}

export interface SweepResult {
  tenantId: string
  autoCancelled: number
  flaggedForReview: number
  notified: number
}

/** Runs the full duplicate-booking sweep for one tenant: auto-cancels true duplicates, notifies admin either way. Used by the daily cron. */
export async function sweepTenantDuplicateBookings(tenantId: string): Promise<SweepResult> {
  const groups = await findDuplicateBookingGroups(tenantId)
  let autoCancelled = 0
  let flaggedForReview = 0
  let notified = 0
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()

  for (const group of groups) {
    const result = await resolveDuplicateBookingGroup(group)
    if (result.autoResolved) {
      autoCancelled += result.autoCancelledBookingIds.length
    } else {
      flaggedForReview++
    }

    const messageType = result.autoResolved ? 'duplicate_recurring_schedule' : 'duplicate_recurring_schedule'
    const message = result.autoResolved
      ? `${group.clientName} had ${result.autoCancelledBookingIds.length + 1} bookings collide on ${group.date} (duplicate recurring schedules). Auto-cancelled the newer duplicate(s); the booking from the older schedule was kept.`
      : `${group.clientName} has 2+ active recurring schedules generating bookings on the same date: ${group.date}. Different services on the colliding bookings -- couldn't auto-resolve, review and deactivate the duplicate.`

    // Same once-per-~week dedupe as the original cron -- don't re-notify daily for a still-unresolved flagged case.
    if (!result.autoResolved) {
      const { count } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('type', messageType)
        .ilike('message', `${group.clientName} has 2+ active recurring schedules%`)
        .gte('created_at', sixDaysAgo)
      if ((count || 0) > 0) continue
    }

    await notify({
      tenantId,
      type: messageType,
      title: result.autoResolved ? 'Duplicate Booking Auto-Cancelled' : 'Duplicate Recurring Schedule Detected',
      message,
      recipientType: 'admin',
    })
    notified++
  }

  return { tenantId, autoCancelled, flaggedForReview, notified }
}
