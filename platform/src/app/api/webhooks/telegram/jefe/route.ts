// Jefe's own Telegram webhook — the PLATFORM GM bot (Jeff <-> Jefe).
// Distinct from the per-tenant [tenant] route: this one is not tenant-scoped.
// It runs askJefe (platform brain) over Full Loop's whole health.
//
// Config via env (no tenant row): JEFE_BOT_TOKEN + JEFE_OWNER_CHAT_ID
// (falls back to TELEGRAM_OWNER_CHAT_ID — Jeff's chat id is the same across bots).
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
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

  // Platform conversation (tenant_id null) so history persists across turns.
  const phone = `jefe-${chatId}`
  let convoId: string
  try {
    const { data: open } = await supabaseAdmin
      .from('sms_conversations')
      .select('id')
      .eq('state', 'jefe-platform')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
    if (open && open.length) {
      convoId = open[0].id
    } else {
      const { data: created, error } = await supabaseAdmin
        .from('sms_conversations')
        .insert({ phone, state: 'jefe-platform', booking_checklist: { channel: 'telegram', chat_id: String(chatId) } })
        .select('id')
        .single()
      if (error || !created) {
        await sendTelegram(chatId, `[jefe setup error] ${error?.message || 'convo create failed'}`, BOT_TOKEN)
        return NextResponse.json({ ok: true, error: 'convo_create_failed' })
      }
      convoId = created.id
    }
  } catch (err) {
    await sendTelegram(chatId, `[jefe setup error] ${err instanceof Error ? err.message : String(err)}`, BOT_TOKEN)
    return NextResponse.json({ ok: true, error: 'convo_lookup_threw' })
  }

  await supabaseAdmin.from('sms_conversation_messages').insert({ conversation_id: convoId, direction: 'inbound', message: text }).then(() => {}, () => {})

  // Load recent history for context.
  const { data: msgs } = await supabaseAdmin
    .from('sms_conversation_messages')
    .select('direction, message')
    .eq('conversation_id', convoId)
    .order('created_at', { ascending: true })
    .limit(20)
  const history = (msgs || []).slice(0, -1).map((m) => ({
    role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.message,
  }))

  let reply = ''
  try {
    const r = await askJefe(text, history)
    reply = r.text || '[Jefe returned empty — check ANTHROPIC_API_KEY / logs]'
  } catch (err) {
    reply = `[Jefe error] ${(err instanceof Error ? err.message : String(err)).slice(0, 400)}`
  }

  await supabaseAdmin.from('sms_conversation_messages').insert({ conversation_id: convoId, direction: 'outbound', message: reply }).then(() => {}, () => {})
  const send = await sendTelegram(chatId, reply, BOT_TOKEN)
  return NextResponse.json({ ok: true, send_ok: send.ok })
}
