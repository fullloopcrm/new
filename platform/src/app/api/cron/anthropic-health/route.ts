import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { protectCronAPI } from '@/lib/nycmaid/auth'
import { notifyOwnerOnTelegram } from '@/lib/telegram'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 30

const ALERT_COOLDOWN_MS = 30 * 60 * 1000

// Periodic ping to the Anthropic API. Catches credit-low / auth / rate-limit
// failures BEFORE the next live customer message hits Yinez and gets silently
// dropped. Platform-wide (the API key is shared across tenants), so alerts go
// to the platform owner via Telegram rather than per-tenant admins.
//
// nycmaid parity: alert once per 30 min per failure kind (system_state-backed
// there). This cron runs every 15 min, so without a cooldown an outage spams
// the owner's Telegram every tick instead of once. Ported using `notifications`
// (verified table, used the same way by cron/comms-monitor) rather than
// system_state, which isn't referenced anywhere else in this codebase.
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
      const kind = isCreditError ? 'credit_low' : isAuthError ? 'auth' : 'rate_limit'
      const alertType = `anthropic_health_alert_${kind}`
      const cooldownSince = new Date(Date.now() - ALERT_COOLDOWN_MS).toISOString()

      const { data: recent } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('type', alertType)
        .gte('created_at', cooldownSince)
        .limit(1)

      if (!recent || recent.length === 0) {
        const title = isCreditError
          ? 'URGENT: Yinez OUT OF CREDITS — Anthropic API'
          : isAuthError
            ? 'URGENT: Yinez Anthropic API auth failing'
            : 'WARN: Yinez Anthropic rate limited'
        const body = isCreditError
          ? 'Yinez is silent across every tenant. Top up at console.anthropic.com.'
          : `Anthropic error: ${msg.slice(0, 300)}`
        await notifyOwnerOnTelegram(`${title}\n\n${body}`).catch(() => {})
        await supabaseAdmin.from('notifications').insert({
          type: alertType,
          title,
          message: msg.slice(0, 500),
          channel: 'system',
          recipient_type: 'admin',
        }).then(() => {}, () => {})
      }
    }

    return NextResponse.json(
      { ok: false, error: msg.slice(0, 500) },
      { status: 500 },
    )
  }
}
