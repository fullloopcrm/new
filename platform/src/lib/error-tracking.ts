import { supabaseAdmin } from '@/lib/supabase'
import { alertOwner, alertOwnerCritical } from '@/lib/telegram'
import * as Sentry from '@sentry/nextjs'

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

  // 1. Log to error_logs — deduped against the same still-open (route,
  // message, tenant) within the last 24h instead of inserting a fresh row
  // every time. Recurring checks (e.g. an hourly cron that's been broken for
  // two weeks) used to pile up hundreds of identical rows, burying real
  // signal under noise nobody was triaging. A repeat now bumps
  // occurrence_count and created_at on the existing row (so "when" reads as
  // "last seen", which is the more useful signal for an ongoing problem)
  // instead of creating a duplicate.
  try {
    const route = context.source || null
    const truncatedMessage = message.slice(0, 1000)
    const { data: existing } = await supabaseAdmin
      .from('error_logs')
      .select('id, metadata')
      .eq('resolved', false)
      .is('dismissed_at', null)
      .eq('message', truncatedMessage)
      .eq('route', route as string)
      .eq('tenant_id', context.tenantId || null)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      const priorCount = (existing.metadata as { occurrence_count?: number } | null)?.occurrence_count || 1
      await supabaseAdmin.from('error_logs').update({
        created_at: new Date().toISOString(),
        metadata: { ...(existing.metadata as object | null), occurrence_count: priorCount + 1, extra: context.extra },
      }).eq('id', existing.id)
    } else {
      await supabaseAdmin.from('error_logs').insert({
        severity,
        message: truncatedMessage,
        stack: stack?.slice(0, 2000) || null,
        tenant_id: context.tenantId || null,
        route,
        action: context.source || null,
        metadata: { occurrence_count: 1, ...(context.extra ? { extra: context.extra } : {}) },
      })
    }
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
      const subject = `${severity === 'critical' ? '🔴 CRITICAL' : '🟠 HIGH'} Error: ${context.source}`
      await alertOwner(subject, detail)
        .catch((e) => console.error('Failed to send error alert to Telegram:', e))
      if (severity === 'critical') {
        await alertOwnerCritical(subject, detail)
          .catch((e) => console.error('Failed to send critical SMS alert:', e))
      }
    }
  }

  // Always console.error for Vercel logs
  console.error(`[${severity.toUpperCase()}] ${context.source}:`, message, stack || '')

  // Dual-write to Sentry alongside error_logs (docs/adr/0006) — real stack
  // traces + fingerprint-based grouping, while error_logs stays the fast
  // at-a-glance + Telegram/SMS alerting surface. Never let this throw.
  try {
    Sentry.captureException(error instanceof Error ? error : new Error(message), {
      tags: { source: context.source, tenantId: context.tenantId },
      level: severity === 'critical' ? 'fatal' : severity === 'high' ? 'error' : severity === 'low' ? 'info' : 'warning',
    })
  } catch (e) {
    console.error('Failed to send error to Sentry:', e)
  }
}

// ---- Auth-failure logging (platform-wide monitoring, Phase 1) ------------
// Every failed login attempt gets an error_logs row so the admin review
// dashboard has full history. Telegram only fires once a rate-limit lockout
// is crossed, not on every attempt — the same "log everything, alert on
// signal" split nycmaid/notify.ts's TELEGRAM_NOTIFY_TYPES exclusion was
// reaching for, applied consistently across every auth surface instead of
// just one legacy route.
const lockoutAlertCooldowns = new Map<string, number>()

interface AuthFailureContext {
  surface: string          // 'admin-auth' | 'portal/auth' | 'team-portal/auth' | 'client/login' | 'sales-partners/login' | 'referrers/auth'
  tenantId?: string | null
  ip: string
  identifier?: string | null // email/phone/slug attempted — never the password/PIN
  lockedOut: boolean          // rl.allowed === false
  remaining?: number
}

export async function logAuthFailure(ctx: AuthFailureContext): Promise<void> {
  try {
    await supabaseAdmin.from('error_logs').insert({
      severity: ctx.lockedOut ? 'high' : 'low',
      message: ctx.lockedOut ? `Login lockout on ${ctx.surface}` : `Failed login on ${ctx.surface}`,
      tenant_id: ctx.tenantId || null,
      route: ctx.surface,
      action: 'auth.failed',
      metadata: {
        ip: ctx.ip,
        identifier: ctx.identifier || null,
        remaining: ctx.remaining ?? null,
        locked_out: ctx.lockedOut,
      },
    })
  } catch (e) {
    console.error('Failed to log auth failure to error_logs:', e)
  }

  if (!ctx.lockedOut) return

  const cooldownKey = `${ctx.surface}:${ctx.ip}`
  const now = Date.now()
  const lastAlert = lockoutAlertCooldowns.get(cooldownKey) || 0
  if (now - lastAlert <= COOLDOWN_MS) return
  lockoutAlertCooldowns.set(cooldownKey, now)

  const detail = [
    `Surface: ${ctx.surface}`,
    `IP: ${ctx.ip}`,
    ctx.identifier ? `Attempted: ${ctx.identifier}` : '',
    ctx.tenantId ? `Tenant: ${ctx.tenantId}` : '',
  ].filter(Boolean).join('\n')

  await alertOwner(`🔒 Login lockout: ${ctx.surface}`, detail)
    .catch((e) => console.error('Failed to send auth lockout alert to Telegram:', e))

  // Only the lockout crossing goes to Sentry, not every failed attempt —
  // same log-everything/alert-on-signal split as the Telegram cooldown above.
  try {
    Sentry.captureMessage(`Login lockout: ${ctx.surface}`, {
      level: 'warning',
      tags: { source: ctx.surface, tenantId: ctx.tenantId },
    })
  } catch (e) {
    console.error('Failed to send lockout to Sentry:', e)
  }
}
