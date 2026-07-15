// Jefe's own Telegram webhook — the PLATFORM GM bot (Jeff <-> Jefe).
// Distinct from the per-tenant [tenant] route: this one is not tenant-scoped.
// It runs askJefe (platform brain) over Full Loop's whole health.
//
// Config via env (no tenant row): JEFE_BOT_TOKEN + JEFE_OWNER_CHAT_ID
// (falls back to TELEGRAM_OWNER_CHAT_ID — Jeff's chat id is the same across bots).
import { NextResponse } from 'next/server'
import { askJefe } from '@/lib/jefe/agent'
import { loadJefeHistory, saveJefeTurn } from '@/lib/jefe/actions'
import { sendTelegram } from '@/lib/telegram'
import { verifyTelegramSecretToken } from '@/lib/webhook-verify'

export const maxDuration = 60

const BOT_TOKEN = (process.env.JEFE_BOT_TOKEN || '').trim()
const OWNER_CHAT_ID = (process.env.JEFE_OWNER_CHAT_ID || process.env.TELEGRAM_OWNER_CHAT_ID || '').trim()
// Same gap as the owner bot: Telegram doesn't sign bodies, and Jefe is the
// platform-GM agent — impersonating Jeff here is the highest-value target in
// the fleet. Falls back to TELEGRAM_WEBHOOK_SECRET like OWNER_CHAT_ID falls
// back to TELEGRAM_OWNER_CHAT_ID. See
// deploy-prep/telegram-webhook-secret-activation.md for the activation step.
const WEBHOOK_SECRET = (process.env.JEFE_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()

export async function POST(req: Request) {
  if (!BOT_TOKEN) return NextResponse.json({ ok: true, skip: 'no_jefe_bot_token' })

  const secretCheck = verifyTelegramSecretToken(req.headers, WEBHOOK_SECRET)
  if (!secretCheck.valid) {
    console.warn('[jefe telegram webhook] rejected:', secretCheck.reason)
    return NextResponse.json({ error: 'Invalid secret token' }, { status: 401 })
  }

  type TgPost = { chat?: { id?: number | string }; text?: string }
  let body: { message?: TgPost; channel_post?: TgPost } = {}
  try { body = await req.json() } catch { return NextResponse.json({ ok: true, parse: 'failed' }) }

  const post = body.message || body.channel_post
  const chatId = post?.chat?.id
  const text = post?.text
  if (!chatId || !text) return NextResponse.json({ ok: true, skip: 'no_chat_or_text' })

  // Fail CLOSED: an unset OWNER_CHAT_ID must reject every chat, not admit
  // every chat. (The sibling owner-bot route uses a Set().has() lookup that
  // already fails closed the same way when unconfigured — this mirrors it.)
  if (!OWNER_CHAT_ID || String(chatId) !== String(OWNER_CHAT_ID)) {
    await sendTelegram(chatId, 'This bot is private.', BOT_TOKEN)
    return NextResponse.json({ ok: true, private: true })
  }

  // Multi-turn: Jefe has his own platform-level history table (jefe_messages,
  // no tenant_id). Threading the last N turns is what makes confirm-then-act
  // work — "yes do it" can reference the proposal from the previous message.
  let reply = ''
  try {
    const history = await loadJefeHistory(10)
    const r = await askJefe(text, history)
    reply = r.text || '[Jefe returned empty — check ANTHROPIC_API_KEY / logs]'
  } catch (err) {
    reply = `[Jefe error] ${(err instanceof Error ? err.message : String(err)).slice(0, 400)}`
  }

  // Persist the turn so the next message has context (best-effort).
  await saveJefeTurn('user', text).catch(() => {})
  if (reply && !reply.startsWith('[Jefe error]')) await saveJefeTurn('assistant', reply).catch(() => {})

  const send = await sendTelegram(chatId, reply, BOT_TOKEN)
  return NextResponse.json({ ok: true, send_ok: send.ok })
}
