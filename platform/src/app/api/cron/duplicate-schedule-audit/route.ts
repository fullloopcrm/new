import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { safeEqual } from '@/lib/timing-safe-equal'
import { tenantServesSite } from '@/lib/tenant-status'

/**
 * Weekly cross-tenant audit (nycmaid ref 33d97974, "the Daniel Mazur
 * incident" — two active recurring_schedules for the same client both
 * generating a booking on the SAME calendar date). The real duplicate
 * signal is "same client, same date, 2+ distinct schedule_ids" — NOT "same
 * day_of_week + preferred_time," which also matches legitimate offset
 * biweekly service modeled as two alternating weekly schedules that never
 * actually collide on a date. Flags via an admin notification per tenant;
 * does not auto-cancel anything.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: rows, error } = await supabaseAdmin
    .from('bookings')  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    .select('tenant_id, client_id, schedule_id, start_time, clients(name)')
    .in('status', ['scheduled', 'pending'])
    .not('schedule_id', 'is', null)
    .gte('start_time', new Date().toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Same class of gap fixed across every other cross-tenant fan-out this
  // session: bookings carries no tenant status of its own, and without this
  // check a suspended/cancelled/deleted tenant's stale schedule data would
  // still get audited and alert an admin who can no longer act on it.
  const candidateTenantIds = Array.from(new Set((rows || []).map((r) => r.tenant_id as string)))
  const { data: candidateTenants } = await supabaseAdmin
    .from('tenants')
    .select('id, status')
    .in('id', candidateTenantIds)
  const servingTenantIds = new Set(
    (candidateTenants || []).filter((t) => tenantServesSite(t.status)).map((t) => t.id as string),
  )

  // (tenant_id, client_id) -> date -> Set of schedule_ids
  const byTenantClientDate = new Map<string, Map<string, Set<string>>>()
  const clientNames = new Map<string, string>()
  const tenantByKey = new Map<string, string>()
  const clientByKey = new Map<string, string>()

  for (const b of rows || []) {
    const tenantId = b.tenant_id as string
    if (!servingTenantIds.has(tenantId)) continue
    const clientId = b.client_id as string
    if (!clientId) continue
    const key = `${tenantId}:${clientId}`
    const date = String(b.start_time).split('T')[0]
    clientNames.set(key, (b.clients as { name?: string } | null)?.name || 'Unknown')
    tenantByKey.set(key, tenantId)
    clientByKey.set(key, clientId)
    if (!byTenantClientDate.has(key)) byTenantClientDate.set(key, new Map())
    const dateMap = byTenantClientDate.get(key)!
    if (!dateMap.has(date)) dateMap.set(date, new Set())
    dateMap.get(date)!.add(b.schedule_id as string)
  }

  const flagged: { tenant_id: string; client_id: string; name: string; dates: string[] }[] = []
  for (const [key, dateMap] of byTenantClientDate) {
    const collidingDates = [...dateMap.entries()]
      .filter(([, scheduleIds]) => scheduleIds.size > 1)
      .map(([date]) => date)
    if (collidingDates.length > 0) {
      flagged.push({
        tenant_id: tenantByKey.get(key)!,
        client_id: clientByKey.get(key)!,
        name: clientNames.get(key) || 'Unknown',
        dates: collidingDates,
      })
    }
  }

  let notified = 0
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()

  for (const f of flagged) {
    // Don't re-notify weekly for a still-unresolved issue — once per ~week
    // per (tenant, client). notifications has no client_id column, so dedupe
    // on the message text instead, scoped to this tenant (multi-tenant —
    // nycmaid's original version didn't need the tenant_id scope).
    const { count } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', f.tenant_id)
      .eq('type', 'duplicate_recurring_schedule')
      .ilike('message', `${f.name} has 2+ active recurring schedules%`)
      .gte('created_at', sixDaysAgo)

    if ((count || 0) > 0) continue

    await notify({
      tenantId: f.tenant_id,
      type: 'duplicate_recurring_schedule',
      title: 'Duplicate Recurring Schedule Detected',
      message: `${f.name} has 2+ active recurring schedules generating bookings on the same date(s): ${f.dates.join(', ')}. Review and deactivate the duplicate.`,
    }).catch(() => {})
    notified++
  }

  return NextResponse.json({ checked: byTenantClientDate.size, flagged: flagged.length, notified })
}
