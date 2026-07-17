import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { safeEqual } from '@/lib/secret-compare'
import { alertOwner } from '@/lib/telegram'

// Nightly backup: exports each tenant's data as JSON snapshot
// Supabase already does daily DB backups on Pro plan, but this gives
// per-tenant granular snapshots we control
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug')
    .eq('status', 'active')

  let backed = 0
  const errors: string[] = []

  for (const tenant of tenants || []) {
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
        errors.push(`${tenant.slug}: ${uploadError.message}`)
      } else {
        backed++
      }
    } catch (err) {
      errors.push(`${tenant.slug}: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }

  // Alert Jeff directly — this is a platform-wide event, not scoped to any
  // one tenant. Previously this stamped tenant_id: tenants[0].id (an
  // arbitrary, unrelated tenant) and inserted into the shared `notifications`
  // table with no recipient_type, which both polluted that tenant's own
  // unread-count badge (sidebar-counts has no recipient_type filter) forever
  // (nothing ever marks it read) and could leak OTHER tenants' slugs/error
  // text into that tenant's notification row. Matches the alertOwner()
  // convention every sibling cron job (system-check, health-check, etc.)
  // already uses for platform-wide alerts.
  if (backed > 0 || errors.length > 0) {
    await alertOwner(
      `Nightly Backup: ${backed} tenant${backed === 1 ? '' : 's'} backed up${errors.length > 0 ? `, ${errors.length} error${errors.length > 1 ? 's' : ''}` : ''}`,
      errors.length > 0 ? errors.join('\n') : undefined,
    ).catch(() => {})
  }

  return NextResponse.json({
    backed_up: backed,
    errors: errors.length,
    error_details: errors,
  })
}
