// Telegram bot helpers — shared between the webhook route (inbound from Jeff)
// and notify() (outbound operational events to Jeff).
import { sendEmail } from './email'

const ADMIN_NOTIFICATION_EMAIL = (process.env.ADMIN_NOTIFICATION_EMAIL || '').trim()

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
// Also fans out to ADMIN_NOTIFICATION_EMAIL when set (re-added 2026-07-26 —
// email had been dropped in favor of Telegram-only, per Jeff: every platform
// alert should land in both). This is every existing alertOwner() call site's
// single choke point, so adding it here covers all of them at once instead of
// touching each one individually. Email is fire-and-forget and never blocks
// or fails the Telegram send.
export async function alertOwner(subject: string, detail?: string): Promise<TelegramSendResult | null> {
  if (ADMIN_NOTIFICATION_EMAIL) {
    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <div style="background: #1E2A4A; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 16px;">${subject.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h2>
        </div>
        <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
          ${detail ? `<pre style="white-space: pre-wrap; font-family: sans-serif; font-size: 14px; color: #111; margin: 0 0 16px 0;">${detail.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>` : ''}
          <p style="color: #999; font-size: 12px; margin: 0;">${new Date().toLocaleString('en-US')} ET</p>
        </div>
      </div>
    `
    sendEmail({ to: ADMIN_NOTIFICATION_EMAIL, subject: `[FL] ${subject}`, html })
      .catch((e) => console.error('Failed to send owner alert email:', e))
  }

  const chatId = (process.env.JEFE_OWNER_CHAT_ID || process.env.TELEGRAM_OWNER_CHAT_ID || '').trim()
  const token = (process.env.JEFE_BOT_TOKEN || '').trim()
  if (!chatId || !token) return null
  const text = detail ? `${subject}\n\n${detail}` : subject
  return sendTelegram(chatId, text, token)
}
