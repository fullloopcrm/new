import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { trackError } from '@/lib/error-tracking'
import { safeEqual } from '@/lib/secret-compare'
import { toNaiveET } from '@/lib/dates'

export const maxDuration = 120

// Update client lifecycle: New→Active→At-Risk→Churned based on booking recency
// Processes in batches of 500 to handle 1000+ tenants safely
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  // clients.created_at is TIMESTAMPTZ (aware) -- real-UTC thirtyDaysAgo is
  // correct against it. bookings.start_time is naive-ET TIMESTAMP (no tz);
  // comparing it against a real-UTC bound mixes reference frames by the
  // EST/EDT offset, so the start_time checks below use the naive-ET-encoded
  // bounds instead.
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString()
  // nowNaiveET's UTC-getter fields already ARE the ET wall-clock digits
  // (that's what toNaiveET+`new Date()` encodes) -- format those fields
  // directly after the ms subtraction below, rather than running the result
  // through toNaiveET() again, which would re-apply the America/New_York
  // conversion a second time and shift the digits by the offset once more.
  const nowNaiveET = new Date(toNaiveET(now))
  const naiveETString = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  }
  const thirtyDaysAgoNaiveET = naiveETString(new Date(nowNaiveET.getTime() - 30 * 24 * 3600 * 1000))
  const ninetyDaysAgoNaiveET = naiveETString(new Date(nowNaiveET.getTime() - 90 * 24 * 3600 * 1000))

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
          .gte('start_time', ninetyDaysAgoNaiveET)

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
            .gte('start_time', thirtyDaysAgoNaiveET)

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
          .gte('start_time', ninetyDaysAgoNaiveET)

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
