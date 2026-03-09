import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Nightly backup: exports each tenant's data as JSON snapshot
// Supabase already does daily DB backups on Pro plan, but this gives
// per-tenant granular snapshots we control
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
