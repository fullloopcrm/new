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
 * This does NOT touch already-generated future bookings — those stay on the
 * calendar for the outgoing operator to close out manually; only the
 * standing recurring commitment (which would otherwise keep spawning new
 * bookings forever) is cancelled.
 */
import { supabaseAdmin } from './supabase'
import { notify } from './notify'
import { collectGdprExport, rowsToCsv, buildManifestText, type GdprSection } from './gdpr-export'
import { audit } from './audit'

const SECTIONS: GdprSection[] = ['bookings', 'invoices', 'communications', 'notes']

export interface TenantOffboardResult {
  schedulesCancelled: number
  clientsNotified: number
  exportPath: string | null
  exportError?: string
}

/**
 * Cancels every non-cancelled recurring_schedules row for the tenant,
 * notifies each affected client by SMS (best-effort — notify() already
 * no-ops gracefully when the tenant has no SMS configured or the comm is
 * gated off), and stores a full data export (reuses the GDPR/CCPA export
 * bundle) to Supabase storage at
 * `uploads/<tenantId>/offboarding-exports/<timestamp>.zip` so the departing
 * operator has their data before the tenant's account goes inactive.
 *
 * Safe to call more than once (idempotent): a second call finds zero
 * non-cancelled schedules and zero clients to notify, and simply regenerates
 * the export. Callers should still guard on the status *transition* (see the
 * admin route) to avoid needless repeat exports/audit rows.
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

  const clientIds = Array.from(
    new Set(scheduleRows.map((s) => s.client_id as string | null).filter((v): v is string => !!v))
  )
  let clientsNotified = 0
  for (const clientId of clientIds) {
    try {
      const result = await notify({
        tenantId,
        type: 'booking_cancelled',
        title: 'Recurring service ended',
        message:
          "Your recurring service has been cancelled — this business is no longer active on our platform. Please contact them directly with any questions.",
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
    details: { schedulesCancelled: scheduleIds.length, clientsNotified, exportPath, exportError },
  }).catch(() => {})

  return { schedulesCancelled: scheduleIds.length, clientsNotified, exportPath, exportError }
}
