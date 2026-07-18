import { supabaseAdmin } from './supabase'

/**
 * Export one tenant's data as a JSON snapshot to Supabase Storage
 * (`platform-backups/backups/<slug>/<date>.json`, upsert so same-day reruns
 * overwrite instead of piling up).
 *
 * Shared by cron/backup (loops every active tenant, CRON_SECRET-gated) and
 * settings/backup (one tenant, triggered by that tenant's own owner/admin from
 * the dashboard) — same snapshot shape and storage path either way, so a
 * manual on-demand backup and the nightly automated one are interchangeable.
 */
export async function backupTenant(
  tenant: { id: string; slug: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const [
      { data: clients },
      { data: bookings },
      { data: team_members },
      { data: service_types },
      { data: recurring_schedules },
      { data: reviews },
      { data: notifications },
      { data: campaigns },
      { data: referrers },
      { data: expenses },
      { data: payroll },
    ] = await Promise.all([
      supabaseAdmin.from('clients').select('*').eq('tenant_id', tenant.id),
      supabaseAdmin.from('bookings').select('*').eq('tenant_id', tenant.id),
      supabaseAdmin.from('team_members').select('*').eq('tenant_id', tenant.id),
      supabaseAdmin.from('service_types').select('*').eq('tenant_id', tenant.id),
      supabaseAdmin.from('recurring_schedules').select('*').eq('tenant_id', tenant.id),
      supabaseAdmin.from('reviews').select('*').eq('tenant_id', tenant.id),
      supabaseAdmin.from('notifications').select('*').eq('tenant_id', tenant.id),
      supabaseAdmin.from('campaigns').select('*').eq('tenant_id', tenant.id),
      supabaseAdmin.from('referrals').select('*').eq('tenant_id', tenant.id),
      supabaseAdmin.from('expenses').select('*').eq('tenant_id', tenant.id),
      supabaseAdmin.from('payroll_payments').select('*').eq('tenant_id', tenant.id),
    ])

    const snapshot = {
      tenant,
      exported_at: new Date().toISOString(),
      data: {
        clients: clients || [],
        bookings: bookings || [],
        team_members: team_members || [],
        service_types: service_types || [],
        recurring_schedules: recurring_schedules || [],
        reviews: reviews || [],
        notifications: notifications || [],
        campaigns: campaigns || [],
        referrers: referrers || [],
        expenses: expenses || [],
        payroll_payments: payroll || [],
      },
    }

    const date = new Date().toISOString().split('T')[0]
    const path = `backups/${tenant.slug}/${date}.json`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('platform-backups')
      .upload(path, JSON.stringify(snapshot, null, 2), {
        contentType: 'application/json',
        upsert: true,
      })

    if (uploadError) return { ok: false, error: uploadError.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown error' }
  }
}
