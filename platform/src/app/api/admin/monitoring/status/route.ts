/**
 * Platform monitoring status endpoint — read-only. Admin-scoped.
 * Returns cron freshness + comms/selena/pipeline counts for the admin dashboard.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

interface CronStatus {
  name: string
  desc: string
  source: 'email_logs' | 'notifications'
  match: Record<string, string>
  maxSilenceMin: number
  subjectLike?: string
}

const CRON_CHECKS: CronStatus[] = [
  { name: 'email-monitor',      desc: 'Every-minute IMAP email poller',  source: 'notifications', match: { type: 'email_monitor_tick' }, maxSilenceMin: 60 },
  { name: 'payment-reminder',   desc: '30-min payment heads-up',         source: 'notifications', match: { type: 'payment_reminder_fired' }, maxSilenceMin: 24 * 60 },
  { name: 'late-check-in',      desc: 'Late check-in alerts',            source: 'notifications', match: { type: 'late_check_in' }, maxSilenceMin: 7 * 24 * 60 },
  { name: 'generate-recurring', desc: 'Recurring booking generator',     source: 'notifications', match: { type: 'recurring_generated' }, maxSilenceMin: 8 * 24 * 60 },
  { name: 'daily-summary',      desc: 'Cleaner 3-day summary',           source: 'notifications', match: { type: 'daily_summary_sent' }, maxSilenceMin: 28 * 60 },
  { name: 'recurring-expenses', desc: 'Daily recurring-expense poster',  source: 'notifications', match: { type: 'recurring_expense_posted' }, maxSilenceMin: 48 * 60 },
]

async function lastOccurrence(check: CronStatus): Promise<Date | null> {
  const tsColumn = 'created_at'
  let q = supabaseAdmin.from(check.source).select(tsColumn).order(tsColumn, { ascending: false }).limit(1)
  for (const [k, v] of Object.entries(check.match)) q = q.eq(k, v)
  const { data } = await q
  if (!data || data.length === 0) return null
  const ts = (data[0] as Record<string, string>)[tsColumn]
  return ts ? new Date(ts) : null
}

async function countInWindow(table: 'notifications' | 'email_logs', match: Record<string, string>, hours: number): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000)
  let q = supabaseAdmin.from(table).select('id', { count: 'exact', head: true }).gte('created_at', since.toISOString())
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v)
  const { count } = await q
  return count || 0
}

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const now = new Date()

  const crons = await Promise.all(
    CRON_CHECKS.map(async c => {
      const last = await lastOccurrence(c)
      const silenceMin = last ? Math.round((now.getTime() - last.getTime()) / 60000) : null
      const healthy = silenceMin !== null && silenceMin <= c.maxSilenceMin
      return {
        name: c.name,
        desc: c.desc,
        lastFired: last?.toISOString() || null,
        silenceMin,
        maxSilenceMin: c.maxSilenceMin,
        healthy,
      }
    }),
  )

  const commsFail24h = await countInWindow('notifications', { type: 'comms_fail' }, 24)
  const commsFail1h = await countInWindow('notifications', { type: 'comms_fail' }, 1)
  const selenaErr24h = await countInWindow('notifications', { type: 'selena_error' }, 24)
  const newLeads24h = await countInWindow('notifications', { type: 'new_lead' }, 24)
  const newBookings24h = await countInWindow('notifications', { type: 'new_booking' }, 24)
  const newLeads1h = await countInWindow('notifications', { type: 'new_lead' }, 1)
  const cronHealthAlerts24h = await countInWindow('notifications', { type: 'cron_health_alert' }, 24)
  const commsMonitorAlerts24h = await countInWindow('notifications', { type: 'comms_monitor_alert' }, 24)

  let errors24h = -1
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const { count } = await supabaseAdmin.from('error_logs').select('id', { count: 'exact', head: true }).gte('created_at', since.toISOString())
    errors24h = count || 0
  } catch {
    errors24h = -1
  }

  const [lastHealthAlert, lastCommsAlert] = await Promise.all([
    lastOccurrence({ name: 'health',   desc: '', source: 'notifications', match: { type: 'cron_health_alert' }, maxSilenceMin: 0 }),
    lastOccurrence({ name: 'commsmon', desc: '', source: 'notifications', match: { type: 'comms_monitor_alert' }, maxSilenceMin: 0 }),
  ])

  return NextResponse.json({
    checkedAt: now.toISOString(),
    crons,
    comms: { failures24h: commsFail24h, failures1h: commsFail1h },
    selena: { errors24h: selenaErr24h },
    pipeline: { newLeads24h, newBookings24h, newLeads1h },
    monitorAlerts: {
      cronHealthAlerts24h,
      commsMonitorAlerts24h,
      lastCronHealthAlert: lastHealthAlert?.toISOString() || null,
      lastCommsFailureAlert: lastCommsAlert?.toISOString() || null,
    },
    errors: { total24h: errors24h },
  })
}
