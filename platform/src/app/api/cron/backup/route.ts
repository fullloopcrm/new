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

  // Log backup results to a platform notification
  if (backed > 0 || errors.length > 0) {
    const superAdminTenant = tenants?.[0]
    if (superAdminTenant) {
      await supabaseAdmin.from('notifications').insert({
        tenant_id: superAdminTenant.id,
        type: 'platform',
        title: 'Nightly Backup Complete',
        message: `${backed} tenants backed up successfully.${errors.length > 0 ? ` ${errors.length} errors: ${errors.join(', ')}` : ''}`,
        channel: 'in_app',
      })
    }
  }

  return NextResponse.json({
    backed_up: backed,
    errors: errors.length,
    error_details: errors,
  })
}
