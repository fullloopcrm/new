// Per-tenant Telegram webhook. Each tenant runs its OWN bot (token stored on
// tenants.telegram_bot_token, encrypted). Telegram is registered to hit this
// URL with the tenant slug in the path, so inbound updates route to the right
// tenant — and the agent identifies as that tenant's agent_name (Jefe by
// default, Yinez for nycmaid).
//
// The platform owner bot (Jeff's) keeps using the global /api/webhooks/telegram
// route. This route is for tenant-owned bots.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { askSelena } from '@/lib/selena/agent'
import { sendTelegram } from '@/lib/telegram'
import { decryptSecret } from '@/lib/secret-crypto'
import { verifyTelegramSecretToken } from '@/lib/webhook-verify'

export const maxDuration = 60

async function logEvent(tenantId: string, type: string, title: string, message: string) {
  await supabaseAdmin
    .from('notifications')
    .insert({ tenant_id: tenantId, type, title, message: message.slice(0, 4000) })
    .then(() => {}, () => {})
}

// Tenant owners aren't in OWNER_PHONES, but reaching this bot from the tenant's
// registered owner chat IS the auth. Pass the platform owner phone so the agent
// unlocks owner tools (gating is phone-based via isOwner()).
function ownerPhone(): string {
  const list = (process.env.OWNER_PHONES || '').split(',').map((s) => s.trim()).filter(Boolean)
  return list[0] || '+12122029220'
}

interface TenantBot {
  id: string
  slug: string
  telegram_bot_token: string | null
  telegram_chat_id: string | null
  telegram_webhook_secret: string | null
}

async function loadTenantBot(slug: string): Promise<TenantBot | null> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, telegram_bot_token, telegram_chat_id, telegram_webhook_secret')
    .eq('slug', slug)
    .single()
  return (data as TenantBot | null) || null
}

export async function POST(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params

  const tenant = await loadTenantBot(slug)
  if (!tenant) return NextResponse.json({ ok: true, skip: 'unknown_tenant' })
  if (!tenant.telegram_bot_token) return NextResponse.json({ ok: true, skip: 'no_bot_token' })

  // Telegram never signs webhook bodies — telegram_chat_id alone is not a
  // real auth boundary since it's compared against a value taken from the
  // (attacker-controlled) POST body. telegram_webhook_secret is NULL until
  // this tenant's bot token is next re-saved (see businesses/[id]/route.ts),
  // so this stays backward compatible with bots registered before this fix.
  const expectedSecret = tenant.telegram_webhook_secret ? decryptSecret(tenant.telegram_webhook_secret) : undefined
  const secretCheck = verifyTelegramSecretToken(req.headers, expectedSecret)
  if (!secretCheck.valid) {
    console.warn(`[telegram webhook] tenant=${slug} rejected:`, secretCheck.reason)
    return NextResponse.json({ error: 'Invalid secret token' }, { status: 401 })
  }

  const botToken = decryptSecret(tenant.telegram_bot_token)

  type TgPost = { chat?: { id?: number | string }; text?: string }
  let body: { message?: TgPost; channel_post?: TgPost } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true, parse: 'failed' })
  }

  // Groups/DMs deliver `message`; channels deliver `channel_post`.
  const post = body.message || body.channel_post
  const chatId = post?.chat?.id
  const text = post?.text
  if (!chatId || !text) return NextResponse.json({ ok: true, skip: 'no_chat_or_text' })

  // Auth: the update must come from this tenant's registered owner chat.
  // Fail CLOSED when telegram_chat_id isn't set yet (bot token saved but the
  // owner hasn't sent their first message to capture their chat id) — the
  // old `tenant.telegram_chat_id && mismatch` form short-circuited false in
  // that gap, letting ANY chat through with owner-tier agent access (same
  // fail-open shape already fixed on the platform Jefe bot, see
  // ../jefe/route.ts).
  if (!tenant.telegram_chat_id || String(chatId) !== String(tenant.telegram_chat_id)) {
    await sendTelegram(chatId, 'This bot is private.', botToken)
    return NextResponse.json({ ok: true, private: true })
  }

  // Tenant-scoped owner conversation, keyed by tenant + chat so it never
  // collides with other tenants or the global owner bot.
  const syntheticPhone = `tg-${tenant.id}-${chatId}`
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
          tenant_id: tenant.id,
          phone: syntheticPhone,
          state: 'telegram-owner',
          booking_checklist: { channel: 'telegram', chat_id: String(chatId), tenant_slug: tenant.slug },
        })
        .select('id')
        .single()
      if (convoErr || !newConvo) {
        await logEvent(tenant.id, 'telegram_error', 'Convo create failed', JSON.stringify(convoErr))
        await sendTelegram(chatId, `[telegram setup error] ${convoErr?.message || 'convo create failed'}`, botToken)
        return NextResponse.json({ ok: true, error: 'convo_create_failed' })
      }
      convoId = newConvo.id
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    await logEvent(tenant.id, 'telegram_error', 'Convo lookup threw', errMsg)
    await sendTelegram(chatId, `[telegram setup error] ${errMsg}`, botToken)
    return NextResponse.json({ ok: true, error: 'convo_lookup_threw' })
  }

  await supabaseAdmin
    .from('sms_conversation_messages')  // tenant-scope-ok: webhook resolves tenant from the verified event payload
    .insert({ conversation_id: convoId, direction: 'inbound', message: text })
    .then(() => {}, () => {})

  let reply = ''
  try {
    const result = await askSelena('telegram', text, convoId, ownerPhone())
    reply = result.text || ''
    if (!reply) {
      await logEvent(tenant.id, 'telegram_error', 'Agent returned empty', JSON.stringify({ toolsCalled: result.toolsCalled }))
      reply = '[agent returned empty reply]'
    }
  } catch (err) {
    const errMsg = err instanceof Error ? `${err.message}\n${err.stack?.slice(0, 1200) || ''}` : String(err)
    await logEvent(tenant.id, 'telegram_error', 'Agent threw', errMsg)
    reply = `[agent error] ${errMsg.slice(0, 400)}`
  }

  await supabaseAdmin
    .from('sms_conversation_messages')  // tenant-scope-ok: webhook resolves tenant from the verified event payload
    .insert({ conversation_id: convoId, direction: 'outbound', message: reply })
    .then(() => {}, () => {})

  const send = await sendTelegram(chatId, reply, botToken)
  if (!send.ok) {
    await logEvent(tenant.id, 'telegram_error', 'sendTelegram failed', `${send.status}: ${send.body.slice(0, 400)}`)
  }
  return NextResponse.json({ ok: true, send_ok: send.ok })
}
