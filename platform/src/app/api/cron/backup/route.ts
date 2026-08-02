import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 300 // Vercel pro plan -- was 60, see note below

// Nightly backup: exports each tenant's data as JSON snapshot
// Supabase already does daily DB backups on Pro plan, but this gives
// per-tenant granular snapshots we control
//
// Tenants are processed in parallel (Promise.all below), not sequentially.
// Live-queried 2026-08-02: the last successful "Nightly Backup Complete"
// notification is dated 2026-07-26 -- confirming this job has silently
// failed every night since (7 straight nights as of this check), with
// zero error rows logged either, matching the timeout signature described
// below. Root cause: tenant count has grown to 34 active (mostly the
// Florida Maid EMD microsite rollout); even parallelized, 34 tenants x
// (11 queries + 1 storage upload) each was almost certainly exceeding the
// prior 60s maxDuration, killing the request mid-run before either the
// catch block or the notification insert could run. Raised maxDuration to
// 300s to match the ceiling already used by cron/reminders, cron/outreach,
// and other multi-tenant crons in this same codebase. NOT live-verified --
// verifying requires either waiting for tonight's scheduled run or
// manually triggering this cron against prod, which is a real production
// write (storage + DB) and wasn't done here without sign-off.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug')
    .eq('status', 'active')

  const results = await Promise.all((tenants || []).map(async (tenant) => {
    try {
      // Export all tenant data
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

      if (uploadError) {
        return { ok: false, error: `${tenant.slug}: ${uploadError.message}` }
      }
      return { ok: true, error: null }
    } catch (err) {
      return { ok: false, error: `${tenant.slug}: ${err instanceof Error ? err.message : 'unknown error'}` }
    }
  }))

  const backed = results.filter(r => r.ok).length
  const errors = results.filter(r => !r.ok).map(r => r.error as string)

  // Log backup results — platform-wide marker, not tied to any one tenant.
  // Previously stamped tenant_id on whichever tenant happened to sort first
  // in the query, which isn't a real admin-facing notification for anyone.
  if (backed > 0 || errors.length > 0) {
    await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
      type: 'platform',
      title: 'Nightly Backup Complete',
      message: `${backed} tenants backed up successfully.${errors.length > 0 ? ` ${errors.length} errors: ${errors.join(', ')}` : ''}`,
      channel: 'system',
      recipient_type: 'admin',
    }).then(() => {}, () => {})
  }

  return NextResponse.json({
    backed_up: backed,
    errors: errors.length,
    error_details: errors,
  })
}
