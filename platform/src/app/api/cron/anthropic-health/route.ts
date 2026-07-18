import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { protectCronAPI } from '@/lib/nycmaid/auth'
import { notifyOwnerOnTelegram } from '@/lib/telegram'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 30

// Re-alert window for an unchanged failure type. Credit exhaustion silences
// Yinez across EVERY tenant until someone tops up console.anthropic.com --
// at least as revenue/customer-impact-critical as cron/tenant-health's
// single-tenant-down case, so it gets the same 1h nag cadence rather than
// cron/health-monitor's 6h internal-cron-liveness window.
const ALERT_WINDOW_MS = 60 * 60 * 1000

// Periodic ping to the Anthropic API. Catches credit-low / auth / rate-limit
// failures BEFORE the next live customer message hits Yinez and gets silently
// dropped. Platform-wide (the API key is shared across tenants), so alerts go
// to the platform owner via Telegram rather than per-tenant admins.
export async function GET(request: Request) {
  const authError = protectCronAPI(request)
  if (authError) return authError

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isCreditError = /credit balance is too low/i.test(msg)
    const isAuthError = /invalid x-api-key|authentication/i.test(msg)
    const isRateLimit = /rate.?limit|429/i.test(msg)

    if (isCreditError || isAuthError || isRateLimit) {
      // Dedup -- previously notifyOwnerOnTelegram() fired unconditionally on
      // every 15-min tick while the API kept failing (zero dedup at all, not
      // even a racy check-then-act window), so a multi-hour outage re-sent
      // this same URGENT DM every 15 min for as long as it lasted. Two-step
      // atomic claim on anthropic_health_alerts(fingerprint), same idiom as
      // cron/health-monitor's cron_health_alerts and cron/tenant-health's
      // tenant_health_alerts: fresh insert first (fingerprint = failure
      // type); on a 23505 conflict, an UPDATE ... WHERE alerted_at is stale
      // reclaims the row -- see 2026_07_18_anthropic_health_alerts_dedup.sql
      // for why a plain permanent unique constraint isn't enough (credit,
      // auth, and rate-limit failures legitimately recur independently).
      const fingerprint = isCreditError ? 'credit' : isAuthError ? 'auth' : 'rate_limit'
      const alertedAtNow = new Date().toISOString()
      const windowStart = new Date(Date.now() - ALERT_WINDOW_MS).toISOString()

      const { error: claimErr } = await supabaseAdmin
        .from('anthropic_health_alerts')
        .insert({ fingerprint, alerted_at: alertedAtNow })

      let claimed = !claimErr
      if (claimErr) {
        if (claimErr.code !== '23505') {
          console.error('[anthropic-health] claim insert failed:', claimErr)
          claimed = false
        } else {
          const { data: reclaimed } = await supabaseAdmin
            .from('anthropic_health_alerts')
            .update({ alerted_at: alertedAtNow })
            .eq('fingerprint', fingerprint)
            .lt('alerted_at', windowStart)
            .select('fingerprint')
            .maybeSingle()
          claimed = !!reclaimed
        }
      }

      if (claimed) {
        const title = isCreditError
          ? 'URGENT: Yinez OUT OF CREDITS — Anthropic API'
          : isAuthError
            ? 'URGENT: Yinez Anthropic API auth failing'
            : 'WARN: Yinez Anthropic rate limited'
        const body = isCreditError
          ? 'Yinez is silent across every tenant. Top up at console.anthropic.com.'
          : `Anthropic error: ${msg.slice(0, 300)}`
        await notifyOwnerOnTelegram(`${title}\n\n${body}`).catch(() => {})
      }
    }

    return NextResponse.json(
      { ok: false, error: msg.slice(0, 500) },
      { status: 500 },
    )
  }
}
