import { supabaseAdmin } from '@/lib/supabase'
import { alertOwner } from '@/lib/telegram'

// Rate limit: track last alert time per error type to avoid spamming
const alertCooldowns = new Map<string, number>()
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

  // 2. Email alert for high/critical errors (rate-limited)
  if (severity === 'high' || severity === 'critical') {
    const cooldownKey = `${context.source}:${message.slice(0, 50)}`
    const lastAlert = alertCooldowns.get(cooldownKey) || 0
    const now = Date.now()

    if (now - lastAlert > COOLDOWN_MS) {
      alertCooldowns.set(cooldownKey, now)
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
