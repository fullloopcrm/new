// Automated duplicate-booking guardrail (Jeff, 2026-08-14): closes the gap
// left by duplicate-schedule-audit's original cron, which only detected two
// active recurring schedules generating a booking for the same client on the
// same calendar date and sent an admin notification -- nothing ever actually
// resolved the duplicate, so it sat there until a human noticed the alert.
//
// Detection was originally scoped to schedule_id-linked collisions only
// (`.not('schedule_id', 'is', null)`), matching the "two recurring schedules"
// incident this cron was ported from (nycmaid, Daniel Mazur, 2026-07-14).
// A live prod check the day this shipped found the actual dominant pattern is
// different: a real NYC Maid customer (Catherine Mollerus) had 142 ACTIVE
// bookings with schedule_id NULL -- ~71 same-date pairs stretching into 2027,
// almost certainly a client-booking-race (two near-simultaneous inserts both
// passing the pre-insert "does this date already have a booking" check before
// either commits -- see 2026_07_13_bookings_same_date_dedup_PROPOSED.sql,
// never applied). The schedule_id-only detection would never have caught this
// at all. Detection now flags ANY 2+ active bookings for one client on one
// date, regardless of whether either has a schedule_id.
//
// SAME "established wins" direction as client-dedupe.ts's canonical pick:
// the EARLIER-created booking survives; later duplicates are auto-cancelled
// via booking-cancel.ts (full finance/deal-sync correctness, no client-facing
// notify -- the client is still served by the surviving booking on that
// date). For a schedule-linked booking, "established" is the recurring
// schedule's own created_at (an old schedule generating one more occurrence
// outranks a brand-new schedule); for a one-off booking, it's the booking's
// own created_at.
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
  schedule_id: string | null
  service_type: string | null
  start_time: string
  status: string
  created_at: string
}

export interface DuplicateBookingGroup {
  tenantId: string
  clientId: string
  clientName: string
  date: string
  bookings: BookingRow[]
}

/** client_id -> date -> booking rows, flagged whenever 2+ active bookings land on the same date -- schedule-linked or one-off. */
export async function findDuplicateBookingGroups(tenantId: string): Promise<DuplicateBookingGroup[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('bookings')
    .select('id, client_id, schedule_id, service_type, start_time, status, created_at, clients(name)')
    .eq('tenant_id', tenantId)
    .in('status', ACTIVE_BOOKING_STATUSES)
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
    dateMap.get(date)!.push({
      id: b.id, client_id: b.client_id, schedule_id: b.schedule_id, service_type: b.service_type,
      start_time: b.start_time, status: b.status, created_at: b.created_at,
    })
  }

  const groups: DuplicateBookingGroup[] = []
  for (const [clientId, dateMap] of byClientDate) {
    for (const [date, bookings] of dateMap) {
      if (bookings.length > 1) {
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

  const scheduleIds = [...new Set(group.bookings.map((b) => b.schedule_id).filter((id): id is string => !!id))]
  const { data: schedules } = scheduleIds.length
    ? await supabaseAdmin.from('recurring_schedules').select('id, created_at').in('id', scheduleIds)
    : { data: [] }
  const scheduleCreatedAt = new Map((schedules || []).map((s: { id: string; created_at: string }) => [s.id, s.created_at]))

  // "Established at" = the linked schedule's created_at when there is one,
  // else the booking's own created_at for a one-off. Earliest wins -- same
  // "more established record wins" direction as client-dedupe.ts's canonical
  // pick.
  const establishedAt = (b: BookingRow): string => (b.schedule_id && scheduleCreatedAt.get(b.schedule_id)) || b.created_at
  const sorted = [...group.bookings].sort((a, b) => {
    const ca = establishedAt(a)
    const cb = establishedAt(b)
    return ca < cb ? -1 : ca > cb ? 1 : 0
  })
  const winningBooking = sorted[0]
  const losers = sorted.slice(1)

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
        reason: 'duplicate booking -- same client, same date, same service, less established than the surviving booking',
        keptBookingId: winningBooking.id,
        keptScheduleId: winningBooking.schedule_id,
        cancelledScheduleId: loser.schedule_id,
        date: group.date,
      },
    })
    cancelledIds.push(loser.id)
  }

  return {
    autoCancelledBookingIds: cancelledIds,
    keptBookingId: winningBooking.id,
    autoResolved: cancelledIds.length > 0,
    reason: 'same service, colliding bookings -- kept the more established one, cancelled the rest',
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

    const messageType = 'duplicate_recurring_schedule'
    const message = result.autoResolved
      ? `${group.clientName} had ${result.autoCancelledBookingIds.length + 1} bookings collide on ${group.date}. Auto-cancelled the duplicate(s); the more established booking was kept.`
      : `${group.clientName} has 2+ active bookings on the same date: ${group.date}. Different services on the colliding bookings -- couldn't auto-resolve, review and cancel the duplicate.`

    // Same once-per-~week dedupe as the original cron -- don't re-notify daily for a still-unresolved flagged case.
    if (!result.autoResolved) {
      const { count } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('type', messageType)
        .ilike('message', `${group.clientName} has 2+ active bookings%`)
        .gte('created_at', sixDaysAgo)
      if ((count || 0) > 0) continue
    }

    await notify({
      tenantId,
      type: messageType,
      title: result.autoResolved ? 'Duplicate Booking Auto-Cancelled' : 'Duplicate Booking Detected',
      message,
      recipientType: 'admin',
    })
    notified++
  }

  return { tenantId, autoCancelled, flaggedForReview, notified }
}
