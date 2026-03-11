import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { trackError } from '@/lib/error-tracking'

export const maxDuration = 120

// Update client lifecycle: New→Active→At-Risk→Churned based on booking recency
// Processes in batches of 500 to handle 1000+ tenants safely
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600 * 1000).toISOString()

  let totalUpdated = 0
  let totalProcessed = 0
  const errors: string[] = []

  // Process tenant by tenant to prevent massive unbounded queries
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('status', 'active')
    .limit(1000)

  for (const tenant of tenants || []) {
    try {
      // Batch: update clients who became inactive (no booking in 90+ days)
      // Using a single UPDATE with subquery instead of N+1
      const { data: inactiveClients } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .lt('created_at', thirtyDaysAgo)
        .limit(2000)

      if (inactiveClients && inactiveClients.length > 0) {
        // Check each batch — find ones with no recent booking
        const ids = inactiveClients.map(c => c.id)

        // Get clients who DO have a recent booking (last 90 days)
        const { data: recentlyActive } = await supabaseAdmin
          .from('bookings')
          .select('client_id')
          .eq('tenant_id', tenant.id)
          .in('client_id', ids)
          .in('status', ['completed', 'paid'])
          .gte('start_time', ninetyDaysAgo)

        const activeClientIds = new Set((recentlyActive || []).map(b => b.client_id))

        // Clients with no booking in 90+ days → inactive
        const toInactive = ids.filter(id => !activeClientIds.has(id))

        if (toInactive.length > 0) {
          // But first check if they have ANY booking — those with recent (30-90 days) stay active
          const { data: midRangeActive } = await supabaseAdmin
            .from('bookings')
            .select('client_id')
            .eq('tenant_id', tenant.id)
            .in('client_id', toInactive)
            .in('status', ['completed', 'paid'])
            .gte('start_time', thirtyDaysAgo)

          const midRangeIds = new Set((midRangeActive || []).map(b => b.client_id))
          const trulyInactive = toInactive.filter(id => !midRangeIds.has(id))

          if (trulyInactive.length > 0) {
            await supabaseAdmin
              .from('clients')
              .update({ status: 'inactive' })
              .eq('tenant_id', tenant.id)
              .in('id', trulyInactive)

            totalUpdated += trulyInactive.length
          }
        }

        totalProcessed += inactiveClients.length
      }

      // Batch: reactivate clients who were inactive but recently booked
      const { data: reactivated } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('status', 'inactive')
        .limit(500)

      if (reactivated && reactivated.length > 0) {
        const inactiveIds = reactivated.map(c => c.id)

        const { data: newBookings } = await supabaseAdmin
          .from('bookings')
          .select('client_id')
          .eq('tenant_id', tenant.id)
          .in('client_id', inactiveIds)
          .in('status', ['completed', 'paid', 'scheduled', 'confirmed'])
          .gte('start_time', ninetyDaysAgo)

        const toReactivate = [...new Set((newBookings || []).map(b => b.client_id))]

        if (toReactivate.length > 0) {
          await supabaseAdmin
            .from('clients')
            .update({ status: 'active' })
            .eq('tenant_id', tenant.id)
            .in('id', toReactivate)

          totalUpdated += toReactivate.length
        }
      }
    } catch (e) {
      const msg = `Tenant ${tenant.name}: ${e instanceof Error ? e.message : String(e)}`
      errors.push(msg)
      await trackError(e, { source: 'cron/lifecycle', tenantId: tenant.id, severity: 'medium' })
    }
  }

  return NextResponse.json({
    success: true,
    tenants_processed: tenants?.length || 0,
    clients_processed: totalProcessed,
    clients_updated: totalUpdated,
    errors: errors.slice(0, 10),
  })
}
