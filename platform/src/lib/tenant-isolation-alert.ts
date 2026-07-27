/**
 * Tenant-isolation breach alert — fires when tenantDb() detects that a query
 * scoped to one tenant returned a row actually owned by a different tenant.
 * This should never happen; if it does, it's either a live cross-tenant data
 * leak or a bug in a query bypassing the wrapper's filter (e.g. a raw
 * supabaseAdmin call, or a `.or()` clause that widens past the tenant_id eq).
 *
 * Best-effort and fire-and-forget — never throws into the caller, and never
 * blocks or alters the (already-wrong) data the caller is about to receive.
 * This only sounds the alarm; see tenant-db.ts for where it's triggered from.
 *
 * Routes through alertOwner/alertOwnerCritical (2026-07-27), not raw email —
 * same no-email-to-inbox policy as every other platform monitoring alert.
 * Treated as critical: it's the most severe class of platform bug there is.
 */
import { alertOwner, alertOwnerCritical } from './telegram'
import { supabaseAdmin } from './supabase'

interface TenantIsolationBreachInput {
  requestedTenantId: string
  leakedTenantId: string
  table: string
  rowIds: (string | number)[]
}

export async function reportTenantIsolationBreach(input: TenantIsolationBreachInput): Promise<void> {
  const { requestedTenantId, leakedTenantId, table, rowIds } = input
  const idsPreview = rowIds.slice(0, 10).join(', ') + (rowIds.length > 10 ? ', …' : '')
  const description = `Query scoped to tenant ${requestedTenantId} on "${table}" returned ${rowIds.length} row(s) belonging to tenant ${leakedTenantId}. Row ids: ${idsPreview}`

  // Always log to stderr first — this must never depend on either downstream
  // call succeeding to leave SOME trace.
  console.error('[tenant-isolation-breach]', description)

  try {
    await supabaseAdmin.from('security_events').insert({
      tenant_id: requestedTenantId,
      type: 'tenant_isolation_breach',
      description,
    })
  } catch (e) {
    console.error('[tenant-isolation-breach] failed to log security_events row:', e)
  }

  const subject = `🔴 Tenant isolation breach — ${table}`
  await alertOwner(subject, description)
    .catch((e) => console.error('[tenant-isolation-breach] failed to send Telegram alert:', e))
  await alertOwnerCritical(subject, description)
    .catch((e) => console.error('[tenant-isolation-breach] failed to send critical SMS alert:', e))
}
