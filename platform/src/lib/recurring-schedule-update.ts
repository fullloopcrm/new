import { tenantDb } from './tenant-db'
import { nowNaiveET, type RecurringType } from './recurring'
import { syncFutureBookings, type SyncResult, type ScheduleSyncFields } from './recurring-sync'
import { notify } from './notify'

// The ONE place recurring_schedules gets edited after creation. Never
// cancel+recreate a schedule for an edit -- both the admin
// (PUT /api/admin/recurring-schedules/[id]) and client
// (PUT /api/client/recurring/[id]) edit routes call this. Before this
// existed, the client side had no edit endpoint at all -- only create -- so
// a client "editing" their schedule meant cancelling the old one and
// creating a new one as two separate calls. That produced duplicate active+
// cancelled schedule rows for the same day/time (9 nycmaid clients, 6mo
// audit 2026-07-26) and duplicate client-facing confirmation texts/emails
// for what the client experienced as one continuous service.

export interface RecurringScheduleChanges {
  team_member_id?: string | null
  recurring_type?: RecurringType
  day_of_week?: number | null
  days_of_week?: number[] | null
  preferred_time?: string
  duration_hours?: number
  hourly_rate?: number
  pay_rate?: number
  discount_percent?: number | null
  notes?: string
  special_instructions?: string
  status?: string
  referrer_id?: string | null
  sales_partner_id?: string | null
}

export interface UpdateRecurringScheduleOptions {
  dryRun?: boolean
  /** Fire one 'booking_rescheduled' client notification when the edit moves
   * the day/time. Admin edits pass false/omit (existing no-client-comms
   * policy for admin-managed schedules, see admin route header); the
   * client-initiated edit route passes true. */
  notifyClient?: boolean
}

export interface UpdateRecurringScheduleResult {
  schedule: Record<string, unknown>
  sync: SyncResult | null
}

/** Thrown when the schedule doesn't exist for this tenant -- distinct from
 * other failures so callers can map it to a 404 instead of a 500. */
export class RecurringScheduleNotFoundError extends Error {
  constructor(scheduleId: string) {
    super(`Recurring schedule not found: ${scheduleId}`)
    this.name = 'RecurringScheduleNotFoundError'
  }
}

function datesChangedFrom(
  current: { recurring_type: string; day_of_week: number | null; days_of_week: number[] | null },
  changes: RecurringScheduleChanges,
): boolean {
  return (
    (changes.recurring_type !== undefined && changes.recurring_type !== current.recurring_type) ||
    (changes.day_of_week !== undefined && changes.day_of_week !== current.day_of_week) ||
    (changes.days_of_week !== undefined &&
      JSON.stringify([...(changes.days_of_week || [])].sort()) !== JSON.stringify([...(current.days_of_week || [])].sort()))
  )
}

/**
 * Update an existing recurring schedule in place and sync already-generated
 * future bookings onto the new configuration. Throws if the schedule
 * doesn't exist (caller is expected to have already checked tenant/ownership
 * before calling this — this function trusts tenantId/scheduleId).
 */
export async function updateRecurringSchedule(
  tenantId: string,
  scheduleId: string,
  changes: RecurringScheduleChanges,
  options: UpdateRecurringScheduleOptions = {},
): Promise<UpdateRecurringScheduleResult> {
  const db = tenantDb(tenantId)

  const { data: current, error: curErr } = await db
    .from('recurring_schedules')
    .select('recurring_type, day_of_week, days_of_week, preferred_time, duration_hours, hourly_rate, discount_percent, client_id')
    .eq('id', scheduleId)
    .single()
  if (curErr || !current) throw new RecurringScheduleNotFoundError(scheduleId)

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (changes.team_member_id !== undefined) updatePayload.team_member_id = changes.team_member_id || null
  if (changes.recurring_type !== undefined) updatePayload.recurring_type = changes.recurring_type
  if (changes.day_of_week !== undefined) updatePayload.day_of_week = changes.day_of_week
  if (changes.days_of_week !== undefined) updatePayload.days_of_week = changes.days_of_week
  if (changes.preferred_time !== undefined) updatePayload.preferred_time = changes.preferred_time
  if (changes.duration_hours !== undefined) updatePayload.duration_hours = changes.duration_hours
  if (changes.hourly_rate !== undefined) updatePayload.hourly_rate = changes.hourly_rate
  if (changes.pay_rate !== undefined) updatePayload.pay_rate = changes.pay_rate
  if (changes.discount_percent !== undefined) updatePayload.discount_percent = changes.discount_percent
  if (changes.notes !== undefined) updatePayload.notes = changes.notes
  if (changes.special_instructions !== undefined) updatePayload.special_instructions = changes.special_instructions
  if (changes.status !== undefined) updatePayload.status = changes.status
  if (changes.referrer_id !== undefined) updatePayload.referrer_id = changes.referrer_id || null
  if (changes.sales_partner_id !== undefined) updatePayload.sales_partner_id = changes.sales_partner_id || null

  const datesChanged = datesChangedFrom(
    { recurring_type: current.recurring_type as string, day_of_week: current.day_of_week as number | null, days_of_week: current.days_of_week as number[] | null },
    changes,
  )
  const timeChanged = changes.preferred_time !== undefined && changes.preferred_time !== current.preferred_time
  const durationChanged =
    changes.duration_hours !== undefined && Number(changes.duration_hours) !== Number(current.duration_hours)
  const affectsFutureBookings =
    datesChanged ||
    timeChanged ||
    durationChanged ||
    (changes.hourly_rate !== undefined && Number(changes.hourly_rate) !== Number(current.hourly_rate)) ||
    (changes.discount_percent !== undefined && changes.discount_percent !== current.discount_percent)
  // Whether the client's actual appointment (day/time/length) moved, as
  // opposed to an invisible-to-the-client rate/discount tweak. Drives the
  // client notification below -- narrower than affectsFutureBookings, which
  // also has to catch rate/discount changes because syncFutureBookings needs
  // to reprice already-generated bookings either way.
  const scheduleVisiblyChanged = datesChanged || timeChanged || durationChanged

  if (options.dryRun) {
    if (!affectsFutureBookings) {
      return {
        schedule: { ...current, ...updatePayload },
        sync: { bookings_synced: 0, bookings_skipped: 0, skipped_reasons: [], new_next_generate_after: null },
      }
    }
    const merged = { ...current, ...updatePayload } as ScheduleSyncFields
    const preview = await syncFutureBookings(tenantId, scheduleId, merged, datesChanged, true)
    return { schedule: { ...current, ...updatePayload }, sync: preview }
  }

  const { data, error: uErr } = await db
    .from('recurring_schedules')
    .update(updatePayload)
    .eq('id', scheduleId)
    .select('*, clients(id, name), team_members(id, name)')
    .single()
  if (uErr) throw new Error(uErr.message)

  // Reassign future bookings if the team member changed, regardless of
  // whether the change also affects date/time/price.
  if (changes.team_member_id !== undefined) {
    await db
      .from('bookings')
      .update({ team_member_id: changes.team_member_id || null })
      .eq('schedule_id', scheduleId)
      .in('status', ['scheduled', 'pending'])
      .gte('start_time', nowNaiveET())
  }

  // Same reasoning as team_member_id above -- attribution is metadata, not a
  // scheduling/pricing field, so it doesn't need to flow through
  // syncFutureBookings' regenerate-or-reprice logic, but already-generated
  // future occurrences still need to carry a corrected referrer/sales
  // partner rather than staying stuck on whatever the schedule had at
  // creation time.
  if (changes.referrer_id !== undefined || changes.sales_partner_id !== undefined) {
    const attributionUpdate: Record<string, unknown> = {}
    if (changes.referrer_id !== undefined) attributionUpdate.referrer_id = changes.referrer_id || null
    if (changes.sales_partner_id !== undefined) attributionUpdate.sales_partner_id = changes.sales_partner_id || null
    await db
      .from('bookings')
      .update(attributionUpdate)
      .eq('schedule_id', scheduleId)
      .in('status', ['scheduled', 'pending'])
      .gte('start_time', nowNaiveET())
  }

  let sync: SyncResult | null = null
  if (affectsFutureBookings) {
    sync = await syncFutureBookings(
      tenantId,
      scheduleId,
      {
        recurring_type: data.recurring_type,
        day_of_week: data.day_of_week,
        days_of_week: data.days_of_week,
        preferred_time: data.preferred_time,
        duration_hours: data.duration_hours,
        hourly_rate: data.hourly_rate,
        discount_percent: data.discount_percent,
      },
      datesChanged,
      false,
    )

    // One notification per edit, never one per synced booking. This is the
    // direct fix for the duplicate-confirmation-text complaints (Hannah Gay,
    // Daniel Mazur, 6mo audit 2026-07-26): the old cancel+recreate path fired
    // a fresh "booking confirmed" alongside a "booking cancelled" for what
    // the client experiences as one continuous recurring service. Only fires
    // when the client's actual appointment moved -- a rate/discount-only
    // edit doesn't need to tell the client their appointment changed.
    if (options.notifyClient && scheduleVisiblyChanged && current.client_id) {
      await notify({
        tenantId,
        type: 'booking_rescheduled',
        title: 'Your recurring schedule changed',
        message: 'Your upcoming cleanings have been updated to your new schedule.',
        channel: 'sms',
        recipientType: 'client',
        recipientId: current.client_id as string,
        metadata: { newDateTime: data.preferred_time },
      }).catch((err: unknown) => console.error('updateRecurringSchedule: notify failed', err))
    }
  }

  return { schedule: data, sync }
}
