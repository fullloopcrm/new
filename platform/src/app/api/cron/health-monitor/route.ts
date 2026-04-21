/**
 * Platform-level cron health check. Ported from nycmaid.
 *
 * Scans `notifications` + `email_logs` for recent evidence of each expected
 * cron job. If any cron has been silent longer than its max-silence window,
 * emails and/or SMSes the platform admin and inserts a `cron_health_alert`
 * notification. Deduplicated: the same failing-cron set is only alerted once
 * per 6 hours.
 *
 * Platform-level: checks run GLOBALLY across all tenants. A cron that writes
 * notifications for ANY tenant counts as "alive." If the cron writes nothing
 * platform-wide for its window, the cron itself is silent.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { trackError } from '@/lib/error-tracking'

type Source = 'email_logs' | 'notifications'

interface CronCheck {
  cron: string
  desc: string
  source: Source
  match: Record<string, string | string[]>
  maxSilenceMin: number
}

// Checks are named to match fullloop's `vercel.json` entries. When a cron has
// no dedicated notification type, watch a side-effect it always produces.
const CHECKS: CronCheck[] = [
  { cron: 'email-monitor',       desc: 'Every-minute IMAP email poller',     source: 'notifications', match: { type: 'email_monitor_tick' }, maxSilenceMin: 60 },
  { cron: 'payment-reminder',    desc: '30-min payment heads-up',            source: 'notifications', match: { type: 'payment_reminder_fired' }, maxSilenceMin: 24 * 60 },
  { cron: 'late-check-in',       desc: 'Late check-in alerts',               source: 'notifications', match: { type: 'late_check_in' }, maxSilenceMin: 7 * 24 * 60 },
  { cron: 'generate-recurring',  desc: 'Recurring booking generator',        source: 'notifications', match: { type: 'recurring_generated' }, maxSilenceMin: 8 * 24 * 60 },
  { cron: 'daily-summary',       desc: 'Cleaner 3-day summary',              source: 'notifications', match: { type: 'daily_summary_sent' }, maxSilenceMin: 28 * 60 },
  { cron: 'recurring-expenses',  desc: 'Daily recurring-expense poster',     source: 'notifications', match: { type: 'recurring_expense_posted' }, maxSilenceMin: 48 * 60 },
  { cron: 'reminders',           desc: '8am client reminder digest',         source: 'email_logs',    match: { subject: 'reminder' }, maxSilenceMin: 36 * 60 },
  // Pipeline freshness — if these go silent, upstream capture is broken.
  { cron: 'pipeline.new_lead',    desc: 'New leads captured',    source: 'notifications', match: { type: 'new_lead' },    maxSilenceMin: 24 * 60 },
  { cron: 'pipeline.new_booking', desc: 'New bookings captured', source: 'notifications', match: { type: 'new_booking' }, maxSilenceMin: 3 * 24 * 60 },
]

async function lastOccurrence(check: CronCheck): Promise<Date | null> {
  const tsColumn = 'created_at'
  let query = supabaseAdmin.from(check.source).select(tsColumn).order(tsColumn, { ascending: false }).limit(1)
  for (const [k, v] of Object.entries(check.match)) {
    if (Array.isArray(v)) query = query.in(k, v)
    else if (k === 'subject') query = query.ilike(k, `%${v}%`)
    else query = query.eq(k, v)
  }
  const { data, error } = await query
  if (error || !data || data.length === 0) return null
  const ts = (data[0] as Record<string, string>)[tsColumn]
  return ts ? new Date(ts) : null
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const failures: Array<{ cron: string; desc: string; lastSeen: string | null; silenceMin: number; maxSilenceMin: number }> = []
    const ok: Array<{ cron: string; lastSeen: string; silenceMin: number }> = []

    for (const c of CHECKS) {
      const last = await lastOccurrence(c)
      const silenceMs = last ? now.getTime() - last.getTime() : Number.POSITIVE_INFINITY
      const silenceMin = Math.round(silenceMs / 60000)
      if (silenceMs > c.maxSilenceMin * 60 * 1000) {
        failures.push({ cron: c.cron, desc: c.desc, lastSeen: last?.toISOString() || null, silenceMin, maxSilenceMin: c.maxSilenceMin })
      } else {
        ok.push({ cron: c.cron, lastSeen: last!.toISOString(), silenceMin })
      }
    }

    if (failures.length > 0) {
      // Dedup — only alert if we haven't alerted about this same failing set in the last 6h.
      const fingerprint = failures.map(f => f.cron).sort().join(',')
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)
      const { data: recentAlerts } = await supabaseAdmin
        .from('notifications')
        .select('id, message')
        .eq('type', 'cron_health_alert')
        .gte('created_at', sixHoursAgo.toISOString())

      const alreadyAlerted = (recentAlerts || []).some(r => (r.message || '').includes(`fingerprint=${fingerprint}`))

      if (!alreadyAlerted) {
        const lines = failures
          .map(f => `• ${f.desc} — silent ${Math.round(f.silenceMin / 60)}h (expected every ${Math.round(f.maxSilenceMin / 60)}h)`)
          .join('\n')
        const subject = `🚨 Cron health — ${failures.length} cron${failures.length === 1 ? '' : 's'} silent`
        const html = `<div style="font-family: sans-serif; max-width: 520px;"><h2 style="color:#b91c1c;">Cron silence detected</h2><pre style="white-space:pre-wrap;">${lines}</pre><p style="margin-top:16px;color:#666;">fingerprint=${fingerprint}</p></div>`

        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
        if (adminEmail) {
          await sendEmail({ to: adminEmail, subject, html }).catch(err => console.error('[health-monitor] alert email failed', err))
        }

        await supabaseAdmin.from('notifications').insert({
          type: 'cron_health_alert',
          title: 'Cron silence detected',
          message: `${failures.length} failing · fingerprint=${fingerprint}`,
          channel: 'system',
          recipient_type: 'admin',
        })
      }
    }

    return NextResponse.json({ success: true, failures, ok, checkedAt: now.toISOString() })
  } catch (err) {
    await trackError(err, { source: 'cron/health-monitor', severity: 'critical' })
    return NextResponse.json({ error: 'health-monitor failed' }, { status: 500 })
  }
}
