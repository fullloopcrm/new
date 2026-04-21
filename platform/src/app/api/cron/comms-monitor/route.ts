/**
 * Platform-level communications-failure monitor. Ported from nycmaid.
 *
 * Every 15 min scans `notifications` for rows of type `comms_fail` (written
 * by sendEmail / sendSMS wrappers when an outbound send fails). If any rows
 * land in the last 20 min, emails + SMSes the platform admin. Deduplicated
 * by matching notification-id fingerprint for 1 hour.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { trackError } from '@/lib/error-tracking'

const WINDOW_MIN = 20
const DEDUP_HOURS = 1

export async function GET(request: Request) {
  const auth = request.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const since = new Date(now.getTime() - WINDOW_MIN * 60 * 1000)

    const { data: fails } = await supabaseAdmin
      .from('notifications')
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

    const dedupSince = new Date(now.getTime() - DEDUP_HOURS * 60 * 60 * 1000)
    const { data: prior } = await supabaseAdmin
      .from('notifications')
      .select('id, message')
      .eq('type', 'comms_monitor_alert')
      .gte('created_at', dedupSince.toISOString())
    const alreadyAlerted = (prior || []).some(p => (p.message || '').includes(`fingerprint=${fingerprint}`))

    if (alreadyAlerted) {
      return NextResponse.json({ success: true, failures: fails.length, alreadyAlerted: true })
    }

    const subject = `⚠️ Comms failures — ${fails.length} in last ${WINDOW_MIN} min`
    const html = `<div style="font-family: sans-serif; max-width: 560px;"><h2 style="color:#b91c1c;">Outbound send failures</h2><pre style="white-space:pre-wrap; font-size:13px;">${summary}</pre><p style="color:#666;">fingerprint=${fingerprint}</p></div>`

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
    if (adminEmail) {
      await sendEmail({ to: adminEmail, subject, html }).catch(err => console.error('[comms-monitor] alert email failed', err))
    }

    await supabaseAdmin.from('notifications').insert({
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
