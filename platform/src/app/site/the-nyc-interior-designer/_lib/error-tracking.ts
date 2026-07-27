import { supabaseAdmin } from '@/app/site/the-nyc-interior-designer/_lib/supabase'
import { alertOwner } from '@/lib/telegram'

const alertCooldowns = new Map<string, number>()
const COOLDOWN_MS = 10 * 60 * 1000

interface ErrorContext {
  source: string
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

  try {
    await supabaseAdmin.from('notifications').insert({ // tenant-scope-ok: single bespoke tenant (the-nyc-interior-designer); retires with cutover
      type: 'error',
      title: `${severity === 'critical' ? 'CRITICAL' : severity === 'high' ? 'WARNING' : 'ERROR'} ${context.source}`,
      message: message.length > 200 ? message.slice(0, 200) + '...' : message
    })
  } catch (e) {
    console.error('Failed to log error notification:', e)
  }

  // Telegram alert for high/critical errors (rate-limited) — no email, ever,
  // for error monitoring. Dashboard row above already covers the
  // full-history/queryable side.
  if (severity === 'high' || severity === 'critical') {
    const cooldownKey = `${context.source}:${message.slice(0, 50)}`
    const lastAlert = alertCooldowns.get(cooldownKey) || 0
    const now = Date.now()

    if (now - lastAlert > COOLDOWN_MS) {
      alertCooldowns.set(cooldownKey, now)
      const detail = [
        `Source: ${context.source}`,
        `Error: ${message}`,
        context.url ? `URL: ${context.url}` : '',
        stack ? `\n${stack.slice(0, 500)}` : '',
      ].filter(Boolean).join('\n')
      await alertOwner(
        `${severity === 'critical' ? '🔴 CRITICAL' : '🟠 HIGH'} Error: ${context.source}`,
        detail,
      ).catch((e) => console.error('Failed to send error alert to Telegram:', e))
    }
  }

  console.error(`[${severity.toUpperCase()}] ${context.source}:`, message, stack || '')
}
