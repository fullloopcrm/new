import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { backupTenant } from '@/lib/tenant-backup'

// POST /api/settings/backup
// "Run Backup Now" on the dashboard settings page (Danger Zone section).
// Backs up ONLY the calling tenant — this is a per-tenant operator action, not
// the platform-wide nightly sweep at cron/backup (CRON_SECRET-gated, loops
// every tenant). Reusing that route's all-tenants logic here would let any
// tenant owner trigger a full-platform backup of every OTHER tenant's data
// from their own settings page.
export async function POST() {
  const { tenant: ctx, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const result = await backupTenant({ id: ctx.tenantId, slug: ctx.tenant.slug })
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Backup failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
