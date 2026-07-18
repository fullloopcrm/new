import { supabaseAdmin } from '@/lib/supabase'
import { alertOwner } from '@/lib/telegram'

// Rate limit: track last alert time per error type to avoid spamming.
// Backed by error_alert_cooldowns (DB), not an in-memory Map -- a Map here
// would live per-instance and reset on every cold start, so on Vercel it
// never reliably suppresses anything across the dozens of call sites that
// pass severity:'high'|'critical'. See
// 2026_07_18_error_alert_cooldowns_durable.sql for the two-step atomic
// claim this uses (same idiom as cron/system-check's own dedup fix).
const COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes

interface ErrorContext {
  source: string       // e.g. 'api/bookings', 'cron/reminders', 'client'
  tenantId?: string    // optional — platform-level errors won't have this
  severity?: 'low' | 'medium' | 'high' | 'critical'
  url?: string
  extra?: string
}

export async function trackError(error: unknown, context: ErrorContext) {
  const message = error instanceof Error
    ? error.message
    : (typeof error === 'object' && error !== null && 'message' in error)
      ? (error as { message: string }).message
      : JSON.stringify(error)
  const stack = error instanceof Error ? error.stack : undefined
  const severity = context.severity || 'medium'

  // 1. Log to error_logs table (persistent, queryable, resolvable)
  try {
    await supabaseAdmin.from('error_logs').insert({
      severity,
      message: message.slice(0, 1000),
      stack: stack?.slice(0, 2000) || null,
      tenant_id: context.tenantId || null,
      route: context.source || null,
      action: context.source || null,
      metadata: context.extra ? { extra: context.extra } : null,
    })
  } catch (e) {
    console.error('Failed to log to error_logs:', e)
  }

  // 2. Also log to notifications table (shows in dashboard)
  try {
    await supabaseAdmin.from('notifications').insert({
      tenant_id: context.tenantId || null,
      type: 'error',
      title: `${context.source}`,
      message: message.length > 200 ? message.slice(0, 200) + '...' : message,
      channel: 'system',
      recipient_type: 'admin',
    })
  } catch (e) {
    console.error('Failed to log error notification:', e)
  }

  // 2. Telegram alert for high/critical errors, DB-backed dedup.
  if (severity === 'high' || severity === 'critical') {
    const fingerprint = `${context.source}:${message.slice(0, 50)}`
    const alertedAtNow = new Date().toISOString()
    const windowStart = new Date(Date.now() - COOLDOWN_MS).toISOString()

    let claimed: boolean
    const { error: claimErr } = await supabaseAdmin
      .from('error_alert_cooldowns')
      .insert({ fingerprint, alerted_at: alertedAtNow })

    if (!claimErr) {
      claimed = true
    } else if (claimErr.code !== '23505') {
      console.error('Failed to claim error alert cooldown:', claimErr)
      claimed = false
    } else {
      const { data: reclaimed } = await supabaseAdmin
        .from('error_alert_cooldowns')
        .update({ alerted_at: alertedAtNow })
        .eq('fingerprint', fingerprint)
        .lt('alerted_at', windowStart)
        .select('fingerprint')
        .maybeSingle()
      claimed = !!reclaimed
    }

    if (claimed) {
      const detail = [
        `Source: ${context.source}`,
        `Error: ${message}`,
        context.tenantId ? `Tenant: ${context.tenantId}` : '',
        context.url ? `URL: ${context.url}` : '',
        stack ? `\n${stack.slice(0, 500)}` : '',
      ].filter(Boolean).join('\n')
      await alertOwner(
        `${severity === 'critical' ? '🔴 CRITICAL' : '🟠 HIGH'} Error: ${context.source}`,
        detail,
      ).catch((e) => console.error('Failed to send error alert to Telegram:', e))
    }
  }

  // Always console.error for Vercel logs
  console.error(`[${severity.toUpperCase()}] ${context.source}:`, message, stack || '')
}
