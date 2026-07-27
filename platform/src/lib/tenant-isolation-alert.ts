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
 */
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

  try {
    const to = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL
    if (!to) {
      console.error('[tenant-isolation-breach] no ADMIN_NOTIFICATION_EMAIL/ADMIN_EMAIL set — alert email not sent')
      return
    }
    const { sendEmail } = await import('./email')
    await sendEmail({
      to,
      subject: `Tenant isolation breach — ${table}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px">
          <h2 style="margin:0 0 2px 0;color:#c00">Tenant Isolation Breach</h2>
          <p style="color:#888;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 16px 0">Automated Security Alert</p>
          <p style="margin:6px 0"><strong>Table:</strong> ${table}</p>
          <p style="margin:6px 0"><strong>Requested tenant:</strong> ${requestedTenantId}</p>
          <p style="margin:6px 0"><strong>Leaked tenant:</strong> ${leakedTenantId}</p>
          <p style="margin:6px 0"><strong>Rows affected:</strong> ${rowIds.length}</p>
          <p style="color:#888;font-size:12px;margin-top:16px">A query scoped to one tenant returned another tenant's row(s) on "${table}". Check every tenantDb()/supabaseAdmin call site on this table immediately.</p>
        </div>`,
    })
  } catch (e) {
    console.error('[tenant-isolation-breach] failed to send alert email:', e)
  }
}
