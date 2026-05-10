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

export async function sendTelegram(chatId: number | string, text: string): Promise<TelegramSendResult> {
  if (!BOT_TOKEN) return { ok: false, status: 0, body: 'TELEGRAM_BOT_TOKEN not set' }
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
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

export async function notifyOwnerOnTelegram(text: string): Promise<TelegramSendResult | null> {
  const target = NOTIFY_CHAT_ID || OWNER_CHAT_ID
  if (!target) return null
  return sendTelegram(target, text)
}
