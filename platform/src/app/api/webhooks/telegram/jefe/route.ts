// Jefe's own Telegram webhook — the PLATFORM GM bot (Jeff <-> Jefe).
// Distinct from the per-tenant [tenant] route: this one is not tenant-scoped.
// It runs askJefe (platform brain) over Full Loop's whole health.
//
// Config via env (no tenant row): JEFE_BOT_TOKEN + JEFE_OWNER_CHAT_ID
// (falls back to TELEGRAM_OWNER_CHAT_ID — Jeff's chat id is the same across bots).
import { NextResponse } from 'next/server'
import { askJefe } from '@/lib/jefe/agent'
import { sendTelegram } from '@/lib/telegram'

export const maxDuration = 60

const BOT_TOKEN = (process.env.JEFE_BOT_TOKEN || '').trim()
const OWNER_CHAT_ID = (process.env.JEFE_OWNER_CHAT_ID || process.env.TELEGRAM_OWNER_CHAT_ID || '').trim()

export async function POST(req: Request) {
  if (!BOT_TOKEN) return NextResponse.json({ ok: true, skip: 'no_jefe_bot_token' })

  type TgPost = { chat?: { id?: number | string }; text?: string }
  let body: { message?: TgPost; channel_post?: TgPost } = {}
  try { body = await req.json() } catch { return NextResponse.json({ ok: true, parse: 'failed' }) }

  const post = body.message || body.channel_post
  const chatId = post?.chat?.id
  const text = post?.text
  if (!chatId || !text) return NextResponse.json({ ok: true, skip: 'no_chat_or_text' })

  if (OWNER_CHAT_ID && String(chatId) !== String(OWNER_CHAT_ID)) {
    await sendTelegram(chatId, 'This bot is private.', BOT_TOKEN)
    return NextResponse.json({ ok: true, private: true })
  }

  // Stateless for now — sms_conversations requires a tenant_id and Jefe is
  // platform-level (no tenant). Multi-turn history is a follow-up (own table).
  let reply = ''
  try {
    const r = await askJefe(text)
    reply = r.text || '[Jefe returned empty — check ANTHROPIC_API_KEY / logs]'
  } catch (err) {
    reply = `[Jefe error] ${(err instanceof Error ? err.message : String(err)).slice(0, 400)}`
  }

  const send = await sendTelegram(chatId, reply, BOT_TOKEN)
  return NextResponse.json({ ok: true, send_ok: send.ok })
}
