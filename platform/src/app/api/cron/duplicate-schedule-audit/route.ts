import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { trackError } from '@/lib/error-tracking'

export const maxDuration = 300

// Tenant-aware port from nycmaid (Daniel Mazur incident, 2026-07-14): two
// active recurring_schedules for the same client both generating a booking
// on the SAME calendar date. That's the real duplicate signal — NOT "same
// day_of_week + preferred_time," which also matches legitimate biweekly
// service modeled as two offset weekly schedules. Flags via an admin
// notification; does not auto-cancel anything.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('status', 'active')
    .limit(1000)

  let totalFlagged = 0
  let totalNotified = 0

  for (const tenant of tenants || []) {
    try {
      const result = await auditTenant(tenant.id)
      totalFlagged += result.flagged
      totalNotified += result.notified
    } catch (err) {
      await trackError(err, { source: 'cron/duplicate-schedule-audit', severity: 'high', tenantId: tenant.id })
    }
  }

  return NextResponse.json({ success: true, flagged: totalFlagged, notified: totalNotified })
}

async function auditTenant(tenantId: string): Promise<{ flagged: number; notified: number }> {
  const { data: rows, error } = await supabaseAdmin
    .from('bookings')
    .select('client_id, schedule_id, start_time, clients(name)')
    .eq('tenant_id', tenantId)
    .in('status', ['scheduled', 'pending'])
    .not('schedule_id', 'is', null)
    .gte('start_time', new Date().toISOString())

  if (error) throw new Error(error.message)

  // client_id -> date -> Set of schedule_ids
  const byClientDate = new Map<string, Map<string, Set<string>>>()
  const clientNames = new Map<string, string>()

  for (const b of rows || []) {
    const date = (b.start_time as string).split('T')[0]
    const clientId = b.client_id as string
    clientNames.set(clientId, (b.clients as { name?: string } | null)?.name || 'Unknown')
    if (!byClientDate.has(clientId)) byClientDate.set(clientId, new Map())
    const dateMap = byClientDate.get(clientId)!
    if (!dateMap.has(date)) dateMap.set(date, new Set())
    dateMap.get(date)!.add(b.schedule_id as string)
  }

  const flagged: { client_id: string; name: string; dates: string[] }[] = []
  for (const [clientId, dateMap] of byClientDate) {
    const collidingDates = [...dateMap.entries()]
      .filter(([, scheduleIds]) => scheduleIds.size > 1)
      .map(([date]) => date)
    if (collidingDates.length > 0) {
      flagged.push({ client_id: clientId, name: clientNames.get(clientId) || 'Unknown', dates: collidingDates })
    }
  }

  let notified = 0
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()

  for (const f of flagged) {
    // Don't re-notify daily for a still-unresolved issue — once per ~week per client.
    // notifications has no client_id column, so dedupe on the message text instead.
    const { count } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'duplicate_recurring_schedule')
      .ilike('message', `${f.name} has 2+ active recurring schedules%`)
      .gte('created_at', sixDaysAgo)

    if ((count || 0) > 0) continue

    await notify({
      tenantId,
      type: 'duplicate_recurring_schedule',
      title: 'Duplicate Recurring Schedule Detected',
      message: `${f.name} has 2+ active recurring schedules generating bookings on the same date(s): ${f.dates.join(', ')}. Review and deactivate the duplicate.`,
      recipientType: 'admin',
    })
    notified++
  }

  return { flagged: flagged.length, notified }
}
