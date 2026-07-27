// Telegram bot helpers — shared between the webhook route (inbound from Jeff)
// and notify() (outbound operational events to Jeff).
import { supabaseAdmin } from './supabase'
import { sendSMS } from './sms'
import { NYCMAID_TENANT_ID } from './nycmaid/tenant'

const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
const OWNER_CHAT_ID = (process.env.TELEGRAM_OWNER_CHAT_ID || '').trim()
// Where ops alerts go. Defaults to the owner's 1:1 chat. If set (e.g. to a
// group chat ID), fan-out targets the group so all admins see the briefings.
const NOTIFY_CHAT_ID = (process.env.TELEGRAM_NOTIFY_CHAT_ID || '').trim()

export interface TelegramSendResult {
  ok: boolean
  status: number
  body: string
}

// botToken overrides the global env token — used by the per-tenant webhook so
// each tenant replies from its own bot. Falls back to the platform bot.
export async function sendTelegram(chatId: number | string, text: string, botToken?: string): Promise<TelegramSendResult> {
  const token = (botToken || BOT_TOKEN).trim()
  if (!token) return { ok: false, status: 0, body: 'no telegram bot token (tenant or env)' }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    const body = await r.text()
    return { ok: r.ok, status: r.status, body }
  } catch (err) {
    return { ok: false, status: 0, body: err instanceof Error ? err.message : String(err) }
  }
}

// Register a bot's webhook with Telegram so inbound updates hit our route.
// Called when a tenant saves/updates its bot token in setup — makes the bot
// live without any manual curl. Pass the RAW (unencrypted) token.
//
// secretToken, when passed, is registered as Telegram's `secret_token` —
// Telegram echoes it back on every real delivery as the
// X-Telegram-Bot-Api-Secret-Token header, which is the only origin proof
// Telegram webhooks offer (bodies aren't signed). Verified server-side via
// verifyTelegramSecret() in webhook-verify.ts. Falls back to the global
// TELEGRAM_WEBHOOK_SECRET env var when no per-call secret is given, so the
// platform owner bot (which has no per-tenant secret) keeps working.
export async function registerTelegramWebhook(botToken: string, webhookUrl: string, secretToken?: string): Promise<TelegramSendResult> {
  const token = botToken.trim()
  if (!token) return { ok: false, status: 0, body: 'no bot token' }
  const secret = secretToken || (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'channel_post'],
        ...(secret ? { secret_token: secret } : {}),
      }),
    })
    return { ok: r.ok, status: r.status, body: await r.text() }
  } catch (err) {
    return { ok: false, status: 0, body: err instanceof Error ? err.message : String(err) }
  }
}

export async function notifyOwnerOnTelegram(text: string): Promise<TelegramSendResult | null> {
  const target = NOTIFY_CHAT_ID || OWNER_CHAT_ID
  if (!target) return null
  return sendTelegram(target, text)
}

// Platform monitoring/warning alerts to the owner's Jefe channel (the "Full Loop
// CRM" group). Mirrors jefe/heartbeat.ts EXACTLY — same bot + chat so every
// platform alert lands in one place. Plain text, no HTML. No-ops silently if
// the Jefe channel isn't configured.
//
// Email fan-out was removed 2026-07-27 (Jeff's call): monitoring alerts route
// to the monitoring system (error_logs/notifications, surfaced on
// /admin/monitoring) and this Telegram channel only, never to his inbox.
// Critical-severity errors additionally go out via alertOwnerCritical() below.
export async function alertOwner(subject: string, detail?: string): Promise<TelegramSendResult | null> {
  const chatId = (process.env.JEFE_OWNER_CHAT_ID || process.env.TELEGRAM_OWNER_CHAT_ID || '').trim()
  const token = (process.env.JEFE_BOT_TOKEN || '').trim()
  if (!chatId || !token) return null
  const text = detail ? `${subject}\n\n${detail}` : subject
  return sendTelegram(chatId, text, token)
}

// "Major error" channel (2026-07-27, Jeff's call): critical-severity platform
// errors also go out as SMS via NYC Maid's own Telnyx number to NYC Maid's
// owner_phone. NYC Maid is used as the delivery channel because it's the
// fully-configured tenant — this isn't limited to errors about NYC Maid
// specifically, it's the platform's chosen "major alert" pipe. No-ops
// silently if NYC Maid's Telnyx/owner-phone isn't configured.
export async function alertOwnerCritical(subject: string, detail?: string): Promise<void> {
  try {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('telnyx_api_key, telnyx_phone, owner_phone')
      .eq('id', NYCMAID_TENANT_ID)
      .single()
    if (!tenant?.telnyx_api_key || !tenant?.telnyx_phone || !tenant?.owner_phone) return
    const text = detail ? `${subject}\n\n${detail}` : subject
    await sendSMS({
      to: tenant.owner_phone,
      body: text.slice(0, 1500),
      telnyxApiKey: tenant.telnyx_api_key,
      telnyxPhone: tenant.telnyx_phone,
    })
  } catch (err) {
    console.error('Failed to send critical SMS alert:', err)
  }
}
