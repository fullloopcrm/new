// Telegram bot helpers — shared between the webhook route (inbound from Jeff)
// and notify() (outbound operational events to Jeff).

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
export async function registerTelegramWebhook(botToken: string, webhookUrl: string): Promise<TelegramSendResult> {
  const token = botToken.trim()
  if (!token) return { ok: false, status: 0, body: 'no bot token' }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'channel_post'] }),
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
// CRM" group). Replaces the old email-based alerts (system-check, comms/health
// monitors, error-tracking). Mirrors jefe/heartbeat.ts EXACTLY — same bot + chat
// so every platform alert lands in one place. Plain text, no HTML. No-ops
// silently if the Jefe channel isn't configured.
export async function alertOwner(subject: string, detail?: string): Promise<TelegramSendResult | null> {
  const chatId = (process.env.JEFE_OWNER_CHAT_ID || process.env.TELEGRAM_OWNER_CHAT_ID || '').trim()
  const token = (process.env.JEFE_BOT_TOKEN || '').trim()
  if (!chatId || !token) return null
  const text = detail ? `${subject}\n\n${detail}` : subject
  return sendTelegram(chatId, text, token)
}
