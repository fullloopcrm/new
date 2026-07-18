import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { backupTenant } from '@/lib/tenant-backup'

// Nightly backup: exports each tenant's data as JSON snapshot
// Supabase already does daily DB backups on Pro plan, but this gives
// per-tenant granular snapshots we control
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug')
    .eq('status', 'active')

  let backed = 0
  const errors: string[] = []

  for (const tenant of tenants || []) {
    const result = await backupTenant(tenant)
    if (result.ok) {
      backed++
    } else {
      errors.push(`${tenant.slug}: ${result.error}`)
    }
  }

  // Log backup results to a platform notification. This is a cross-tenant
  // summary (every active tenant's backup outcome in one message), not any
  // single tenant's own event -- tenant_id is deliberately omitted, matching
  // every other platform-wide cron's notifications insert (system-check,
  // health-monitor, comms-monitor, generate-monthly-invoices, etc., all
  // marked "tenant-scope-ok: cron job runs platform-wide across all tenants
  // by design"). The old code attached this row to `tenants?.[0]` -- an
  // arbitrary, unordered "first active tenant" -- which silently pinned a
  // cross-tenant summary (other tenants' slugs + errors in the message) to
  // one real tenant's row. `sidebar-counts` counts unread notifications by
  // `tenant_id` + `read=false` with no recipient_type filter, so that one
  // unlucky tenant's dashboard badge silently incremented every night; the
  // content-facing GET /api/notifications filters `recipient_type='admin'`
  // (never set here), so the row could never be opened or marked read --
  // permanent, unexplained, unclearable badge inflation for whichever tenant
  // happened to sort first. The genuine platform-wide surface for this row
  // is already admin/notifications (requireAdmin-gated, reads all tenants'
  // rows by design), which needs no tenant_id to work.
  if (backed > 0 || errors.length > 0) {
    await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
      type: 'platform',
      title: 'Nightly Backup Complete',
      message: `${backed} tenants backed up successfully.${errors.length > 0 ? ` ${errors.length} errors: ${errors.join(', ')}` : ''}`,
      channel: 'in_app',
    })
  }

  return NextResponse.json({
    backed_up: backed,
    errors: errors.length,
    error_details: errors,
  })
}
