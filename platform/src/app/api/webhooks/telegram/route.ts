import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { askSelena } from '@/lib/selena/agent'
import { sendTelegram } from '@/lib/telegram'
import { verifyTelegramWebhook } from '@/lib/telegram-webhook-auth'
import { insertConversationMessage } from '@/lib/sms-messages'

export const maxDuration = 60

const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
const OWNER_CHAT_ID = (process.env.TELEGRAM_OWNER_CHAT_ID || '').trim()
// Platform owner bot operates in nycmaid context (resolveTenantForConversation
// falls back to this when tenant_id is null). sms_conversations.tenant_id is
// NOT NULL since the tenant-isolation migration, so the owner convo must carry
// it explicitly — use the same sentinel the agent already falls back to.
const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'
// Additional admins allowed to message the bot (comma-separated chat IDs).
// Owner is always allowed; this is for additional staff (e.g. Ruth as ops admin).
const EXTRA_CHAT_IDS = (process.env.TELEGRAM_EXTRA_CHAT_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const ALLOWED_CHAT_IDS = new Set<string>(
  [OWNER_CHAT_ID, ...EXTRA_CHAT_IDS].filter(Boolean)
)

async function logEvent(type: string, title: string, message: string) {
  await supabaseAdmin
    .from('notifications')  // tenant-scope-ok: webhook resolves tenant from the verified event payload
    .insert({ type, title, message: message.slice(0, 4000) })
    .then(() => {}, () => {})
}

function ownerPhone(): string {
  const list = (process.env.OWNER_PHONES || '').split(',').map((s) => s.trim()).filter(Boolean)
  return list[0] || '+12122029220'
}

export async function GET() {
  if (!BOT_TOKEN) return NextResponse.json({ error: 'BOT_TOKEN missing' })
  if (!OWNER_CHAT_ID) return NextResponse.json({ error: 'OWNER_CHAT_ID missing' })
  const send = await sendTelegram(OWNER_CHAT_ID, `GET diag fired at ${new Date().toISOString()}`)
  return NextResponse.json({
    bot_token_len: BOT_TOKEN.length,
    owner_chat_id: OWNER_CHAT_ID,
    send_result: send,
  })
}

export async function POST(req: Request) {
  // Authenticity FIRST: only Telegram can produce the secret-token header (set
  // at setWebhook time). Fail-closed before any body-supplied chat_id is trusted
  // to drive the owner agent — a forged chat_id alone must not reach askSelena.
  const verified = verifyTelegramWebhook(req, 'platform-owner')
  if (!verified.ok) {
    return NextResponse.json({ ok: false, error: 'unauthorized', reason: verified.reason }, { status: 401 })
  }

  let body: { message?: { chat?: { id?: number | string }; text?: string } } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true, parse: 'failed' })
  }

  const msg = body.message
  const chatId = msg?.chat?.id
  const text = msg?.text

  if (!chatId || !text) return NextResponse.json({ ok: true, skip: 'no_chat_or_text' })

  if (!ALLOWED_CHAT_IDS.has(String(chatId))) {
    await sendTelegram(chatId, 'This bot is private.')
    return NextResponse.json({ ok: true, private: true })
  }

  // No notification log here — Telegram is Jeff's private bot. The convo
  // already shows in the conversations feed; echoing every message into
  // the bell-notification stream is noise.

  // Find or create owner Telegram conversation.
  // Use a synthetic phone keyed to the Telegram chat ID so we never collide
  // with the owner's real-phone SMS/web conversations (unique active-phone constraint).
  const realPhone = ownerPhone()
  const syntheticPhone = `tg-${chatId}`
  let convoId: string

  try {
    const { data: openConvo } = await supabaseAdmin
      .from('sms_conversations')  // tenant-scope-ok: webhook resolves tenant from the verified event payload
      .select('id')
      .eq('state', 'telegram-owner')
      .eq('phone', syntheticPhone)
      .order('created_at', { ascending: false })
      .limit(1)

    if (openConvo && openConvo.length > 0) {
      convoId = openConvo[0].id
    } else {
      const { data: newConvo, error: convoErr } = await supabaseAdmin
        .from('sms_conversations')
        .insert({
          tenant_id: NYCMAID_TENANT_ID,
          phone: syntheticPhone,
          state: 'telegram-owner',
          booking_checklist: { channel: 'telegram', chat_id: String(chatId), real_phone: realPhone },
        })
        .select('id')
        .single()
      if (convoErr || !newConvo) {
        await logEvent('telegram_error', 'Convo create failed', JSON.stringify(convoErr))
        await sendTelegram(chatId, `[telegram setup error] convo create failed: ${convoErr?.message || 'unknown'}`)
        return NextResponse.json({ ok: true, error: 'convo_create_failed' })
      }
      convoId = newConvo.id
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    await logEvent('telegram_error', 'Convo lookup threw', errMsg)
    await sendTelegram(chatId, `[telegram setup error] ${errMsg}`)
    return NextResponse.json({ ok: true, error: 'convo_lookup_threw' })
  }

  await insertConversationMessage({ conversation_id: convoId, direction: 'inbound', message: text })

  // Run Yinez with full error visibility
  let reply = ''
  try {
    const result = await askSelena('telegram', text, convoId, realPhone)
    reply = result.text || ''
    if (!reply) {
      await logEvent('telegram_error', 'Yinez returned empty', JSON.stringify({ toolsCalled: result.toolsCalled }))
      reply = `[yinez returned empty reply — tools called: ${result.toolsCalled.join(', ') || 'none'}]`
    }
  } catch (err) {
    const errMsg = err instanceof Error ? `${err.message}\n${err.stack?.slice(0, 1500) || ''}` : String(err)
    await logEvent('telegram_error', 'Yinez threw', errMsg)
    reply = `[yinez error] ${errMsg.slice(0, 500)}`
  }

  await insertConversationMessage({ conversation_id: convoId, direction: 'outbound', message: reply })

  const send = await sendTelegram(chatId, reply)
  if (!send.ok) {
    await logEvent('telegram_error', 'sendTelegram failed', `${send.status}: ${send.body.slice(0, 500)}`)
  }
  return NextResponse.json({ ok: true, send_ok: send.ok })
}
