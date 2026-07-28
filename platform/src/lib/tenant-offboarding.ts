/**
 * Tenant offboarding cascade.
 *
 * Triggered when a platform admin transitions a tenant's status to
 * 'cancelled' (see PUT /api/admin/tenants/[id]). Before this existed, flipping
 * a tenant to 'cancelled' only updated the `tenants` row — the tenant's
 * recurring_schedules stayed 'active' and cron/generate-recurring kept
 * generating new bookings for them indefinitely (it never checked tenant
 * status at all), no client heard that their recurring service ended, and no
 * data export was produced before the tenant went dark.
 *
 * It also cancels every already-generated but not-yet-occurred booking for
 * the tenant (regardless of whether it came off a recurring schedule or was
 * booked as a one-off) — otherwise those stayed live on the calendar
 * indefinitely for a business that no longer exists on the platform.
 * Already-completed/paid/no-show bookings are historical record and are
 * never touched.
 */
import { supabaseAdmin } from './supabase'
import { notify } from './notify'
import { collectGdprExport, rowsToCsv, buildManifestText, type GdprSection } from './gdpr-export'
import { audit } from './audit'

const SECTIONS: GdprSection[] = ['bookings', 'invoices', 'communications', 'notes']

export interface TenantOffboardResult {
  schedulesCancelled: number
  bookingsCancelled: number
  clientsNotified: number
  exportPath: string | null
  exportError?: string
}

/**
 * Booking statuses that represent "not yet occurred" — the exact complement
 * of the terminal states (completed/paid/no_show/cancelled) per the status
 * machine enforced in PATCH /api/bookings/[id]/status (VALID_TRANSITIONS
 * there never allows 'cancelled' as a target from any of those terminal
 * states). Used as an allow-list rather than a deny-list so a future new
 * terminal status doesn't silently become cancellable by omission.
 */
const CANCELLABLE_BOOKING_STATUSES = ['pending', 'scheduled', 'confirmed', 'in_progress']

/**
 * Cancels every non-cancelled recurring_schedules row for the tenant and
 * every already-generated, not-yet-occurred booking, notifies each affected
 * client by SMS (best-effort — notify() already no-ops gracefully when the
 * tenant has no SMS configured or the comm is gated off), and stores a full
 * data export (reuses the GDPR/CCPA export bundle) to Supabase storage at
 * `uploads/<tenantId>/offboarding-exports/<timestamp>.zip` so the departing
 * operator has their data before the tenant's account goes inactive.
 *
 * Safe to call more than once (idempotent): a second call finds zero
 * non-cancelled schedules, zero future bookings, and zero clients to notify,
 * and simply regenerates the export. Callers should still guard on the
 * status *transition* (see the admin route) to avoid needless repeat
 * exports/audit rows.
 */
export async function offboardTenant(tenantId: string): Promise<TenantOffboardResult> {
  const { data: schedules } = await supabaseAdmin
    .from('recurring_schedules')
    .select('id, client_id')
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')

  const scheduleRows = schedules || []
  const scheduleIds = scheduleRows.map((s) => s.id as string)

  if (scheduleIds.length > 0) {
    await supabaseAdmin
      .from('recurring_schedules')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .in('id', scheduleIds)
  }

  const scheduleClientIds = new Set(
    scheduleRows.map((s) => s.client_id as string | null).filter((v): v is string => !!v)
  )

  // Cancel every already-generated, not-yet-occurred booking for the tenant
  // — both bookings spawned off the recurring schedules just cancelled above
  // and any standalone one-off booking. "Future" is start_time >= now;
  // "not-yet-occurred" is the allow-list above, so completed/paid/no_show
  // history (even if dated in the future due to a data error) is left
  // alone, matching the DELETE /api/bookings/[id]?cancel_series=true
  // precedent this reuses (same soft-cancel-by-status-update mechanism,
  // widened here from one schedule's series to the whole tenant).
  const nowIso = new Date().toISOString()
  const { data: cancelledBookings } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled', updated_at: nowIso })
    .eq('tenant_id', tenantId)
    .in('status', CANCELLABLE_BOOKING_STATUSES)
    .gte('start_time', nowIso)
    .select('id, client_id')

  const bookingRows = cancelledBookings || []
  const bookingClientIds = new Set(
    bookingRows.map((b) => b.client_id as string | null).filter((v): v is string => !!v)
  )

  const clientIds = Array.from(new Set([...scheduleClientIds, ...bookingClientIds]))
  let clientsNotified = 0
  for (const clientId of clientIds) {
    const hadSchedule = scheduleClientIds.has(clientId)
    const hadBookings = bookingClientIds.has(clientId)
    const title = hadSchedule ? 'Recurring service ended' : 'Upcoming appointments cancelled'
    const message =
      hadSchedule && hadBookings
        ? "Your recurring service and upcoming appointments have been cancelled — this business is no longer active on our platform. Please contact them directly with any questions."
        : hadSchedule
          ? "Your recurring service has been cancelled — this business is no longer active on our platform. Please contact them directly with any questions."
          : "Your upcoming appointment(s) have been cancelled — this business is no longer active on our platform. Please contact them directly with any questions."
    try {
      const result = await notify({
        tenantId,
        type: 'booking_cancelled',
        title,
        message,
        channel: 'sms',
        recipientType: 'client',
        recipientId: clientId,
      })
      if (result.success) clientsNotified++
    } catch (err) {
      console.error('offboardTenant: client notify failed', clientId, err)
    }
  }

  let exportPath: string | null = null
  let exportError: string | undefined
  try {
    const bundle = await collectGdprExport(tenantId, null, new Date().toISOString())
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    zip.file('manifest.txt', buildManifestText(bundle))
    zip.file('export.json', JSON.stringify(bundle, null, 2))
    for (const section of SECTIONS) zip.file(`${section}.csv`, rowsToCsv(bundle.sections[section]))
    const buf = await zip.generateAsync({ type: 'nodebuffer' })
    const path = `${tenantId}/offboarding-exports/${Date.now()}.zip`
    const { error: uploadErr } = await supabaseAdmin.storage.from('uploads').upload(path, buf, {
      contentType: 'application/zip',
      upsert: false,
    })
    if (uploadErr) {
      exportError = uploadErr.message
    } else {
      exportPath = path
    }
  } catch (err) {
    exportError = err instanceof Error ? err.message : String(err)
    console.error('offboardTenant: export failed', tenantId, err)
  }

  await audit({
    tenantId,
    action: 'tenant.offboarded',
    entityType: 'tenant',
    entityId: tenantId,
    details: {
      schedulesCancelled: scheduleIds.length,
      bookingsCancelled: bookingRows.length,
      clientsNotified,
      exportPath,
      exportError,
    },
  }).catch(() => {})

  return {
    schedulesCancelled: scheduleIds.length,
    bookingsCancelled: bookingRows.length,
    clientsNotified,
    exportPath,
    exportError,
  }
}
