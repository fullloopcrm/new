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
import { supabaseAdmin } from '@/lib/supabase'
import { verifyTelegramSecret } from '@/lib/webhook-verify'

export const maxDuration = 60

const BOT_TOKEN = (process.env.JEFE_BOT_TOKEN || '').trim()
const OWNER_CHAT_ID = (process.env.JEFE_OWNER_CHAT_ID || process.env.TELEGRAM_OWNER_CHAT_ID || '').trim()

export async function POST(req: Request) {
  // Fail-OPEN pre-activation — see the sibling /api/webhooks/telegram route
  // for why: only enforced once TELEGRAM_WEBHOOK_SECRET is set AND this bot's
  // webhook has been re-registered with it (registerTelegramWebhook / a manual
  // setWebhook call for Jefe's own bot, which isn't tenant-config-driven).
  if ((process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()) {
    const auth = verifyTelegramSecret(req.headers, process.env.TELEGRAM_WEBHOOK_SECRET)
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!BOT_TOKEN) return NextResponse.json({ ok: true, skip: 'no_jefe_bot_token' })

  type TgPost = { chat?: { id?: number | string }; text?: string }
  let body: { update_id?: number; message?: TgPost; channel_post?: TgPost } = {}
  try { body = await req.json() } catch { return NextResponse.json({ ok: true, parse: 'failed' }) }

  const post = body.message || body.channel_post
  const chatId = post?.chat?.id
  const text = post?.text
  if (!chatId || !text) return NextResponse.json({ ok: true, skip: 'no_chat_or_text' })

  // Telegram resends the SAME update_id if this route doesn't respond 200
  // promptly. Worse here than the sibling owner/tenant routes: Jefe's
  // action tools (notify_tenant_owner, send_tenant_message, rerun_cron —
  // see lib/jefe/agent.ts) are confirm-gated by Jeff sending a plain "yes"
  // as a follow-up message. If THAT confirm message is the one redelivered,
  // the confirm=true tool call — a real SMS/email to a tenant owner, a real
  // in-platform post, a real cron re-fire — runs twice. Claimed before any
  // agent call so a redelivery short-circuits before the tool ever fires.
  if (body.update_id !== undefined) {
    const { error: claimErr } = await supabaseAdmin
      .from('telegram_webhook_updates')
      .insert({ dedup_key: `jefe:${body.update_id}` })
    if (claimErr) {
      if (claimErr.code === '23505') {
        return NextResponse.json({ ok: true, action: 'duplicate_delivery' })
      }
      console.error('[telegram jefe webhook] update claim failed:', claimErr)
      // Fall through — an infra hiccup on the dedup table must not
      // silently drop a real inbound message.
    }
  }

  // Fail CLOSED when no owner chat id is configured yet — same class as the
  // [tenant]/route.ts sibling fix: an unset OWNER_CHAT_ID used to skip this
  // check entirely, letting anyone who found the bot talk to Jefe (platform
  // GM agent, fleet-wide tools) as if owner-verified.
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
