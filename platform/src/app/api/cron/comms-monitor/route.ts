/**
 * Platform-level communications-failure monitor. Ported from nycmaid.
 *
 * Every 15 min scans `notifications` for rows of type `comms_fail` (written
 * by sendEmail / sendSMS wrappers when an outbound send fails). If any rows
 * land in the last 20 min, emails + SMSes the platform admin. Deduplicated
 * by an insert-first claim on comms_monitor_alerts(fingerprint) -- see
 * 2026_07_18_comms_monitor_alerts_dedup.sql for why a SELECT-then-insert
 * check against `notifications` raced (two overlapping invocations could
 * both see zero prior alerts for the same fingerprint and both DM the
 * admin) and why a plain unique constraint replaces the old time-windowed
 * check without changing behavior.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { alertOwner } from '@/lib/telegram'
import { trackError } from '@/lib/error-tracking'
import { safeEqual } from '@/lib/secret-compare'

const WINDOW_MIN = 20

export async function GET(request: Request) {
  const auth = request.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const since = new Date(now.getTime() - WINDOW_MIN * 60 * 1000)

    const { data: fails } = await supabaseAdmin
      .from('notifications')  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
      .select('id, message, created_at')
      .eq('type', 'comms_fail')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    if (!fails || fails.length === 0) {
      return NextResponse.json({ success: true, failures: 0 })
    }

    const summary = fails.map(f => `• ${f.message}`).join('\n')
    const fingerprint = fails.map(f => f.id).sort().join(',').slice(0, 60)

    // Insert-first claim: a unique violation on fingerprint means another
    // overlapping invocation already claimed (and is alerting for) this
    // exact failure batch -- skip as an idempotent no-op, same idiom as
    // telnyx_webhook_events / resend_webhook_events / stripe_webhook_events.
    const { error: claimErr } = await supabaseAdmin
      .from('comms_monitor_alerts')
      .insert({ fingerprint })
    if (claimErr) {
      if (claimErr.code === '23505') {
        return NextResponse.json({ success: true, failures: fails.length, alreadyAlerted: true })
      }
      throw claimErr
    }

    const subject = `⚠️ Comms failures — ${fails.length} in last ${WINDOW_MIN} min`
    await alertOwner(subject, `${summary}\nfingerprint=${fingerprint}`).catch(err => console.error('[comms-monitor] alert telegram failed', err))

    await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
      type: 'comms_monitor_alert',
      title: 'Comms failures detected',
      message: `${fails.length} failures · fingerprint=${fingerprint}`,
      channel: 'system',
      recipient_type: 'admin',
    })

    return NextResponse.json({ success: true, failures: fails.length, alerted: true })
  } catch (err) {
    await trackError(err, { source: 'cron/comms-monitor', severity: 'critical' })
    return NextResponse.json({ error: 'comms-monitor failed' }, { status: 500 })
  }
}
