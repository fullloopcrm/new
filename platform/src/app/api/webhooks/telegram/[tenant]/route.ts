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
import { insertConversationMessage } from '@/lib/sms-messages'
import { verifyTelegramSecretToken } from '@/lib/webhook-verify'
import { tenantServesSite } from '@/lib/tenant-status'

export const maxDuration = 60

async function logEvent(tenantId: string, type: string, title: string, message: string) {
  await supabaseAdmin
    .from('notifications')  // tenant-scope-ok: tenant_id stamped from the caller's already-resolved tenantId
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
  status: string | null
  telegram_bot_token: string | null
  telegram_chat_id: string | null
  telegram_webhook_secret: string | null
}

async function loadTenantBot(slug: string): Promise<TenantBot | null> {
  // tenant-scope-ok: N/A for tenantDb — this IS the tenant resolution step
  // (lookup by slug), so there is no tenantId yet to scope by.
  //
  // maybeSingle() (not single()) — slug is UNIQUE NOT NULL at the DB level,
  // so 0 rows legitimately means "unknown tenant" (the caller already treats
  // that as a soft no-op below), not an error. single() can't tell that
  // apart from a genuine DB failure — both surfaced identically as
  // data:null, silently misreporting a real outage as "unknown_tenant".
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, status, telegram_bot_token, telegram_chat_id, telegram_webhook_secret')
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    console.error(`TELEGRAM_WEBHOOK_TENANT_LOOKUP_ERROR slug=${slug} error=${error.message}`)
    throw new Error(`TELEGRAM_WEBHOOK_TENANT_LOOKUP_ERROR slug=${slug} error=${error.message}`)
  }
  return (data as TenantBot | null) || null
}

export async function POST(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  // Lowercase — slugs are always generated lowercase (slugify()/toSlug() in
  // every tenant-creation path, per tenant.ts/tenant-lookup.ts's shared
  // resolver contract). The URL path segment is admin-registered (usually
  // already lowercase) but not guaranteed to stay that way, and this route
  // hand-rolls its own tenants.slug lookup instead of going through the
  // shared resolver — normalize here so it doesn't silently drop a real
  // tenant's inbound updates on a case mismatch.
  const { tenant: rawSlug } = await params
  const slug = rawSlug.toLowerCase()

  const tenant = await loadTenantBot(slug)
  if (!tenant) return NextResponse.json({ ok: true, skip: 'unknown_tenant' })
  // Same class of gap fixed across every other slug/host-resolved entry point
  // this session (PIN-login, portal/team-portal auth tokens, public site
  // header resolver): this route hand-rolls its own tenants.slug lookup
  // instead of going through the shared resolver, so it never inherited
  // tenantServesSite(). Without this, a suspended/cancelled/deleted tenant's
  // Telegram bot would keep answering inbound messages and running the AI
  // agent against that tenant's live data indefinitely — Telegram delivery
  // has no dependency on the tenant's site/dashboard being reachable.
  if (!tenantServesSite(tenant.status)) return NextResponse.json({ ok: true, skip: 'tenant_not_active' })
  if (!tenant.telegram_bot_token) return NextResponse.json({ ok: true, skip: 'no_bot_token' })

  const secret = tenant.telegram_webhook_secret ? decryptSecret(tenant.telegram_webhook_secret) : undefined
  const verify = verifyTelegramSecretToken(req.headers, secret)
  if (!verify.valid) {
    console.warn(`[telegram webhook:${slug}] rejected:`, verify.reason)
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
  if (tenant.telegram_chat_id && String(chatId) !== String(tenant.telegram_chat_id)) {
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

  await insertConversationMessage(
    { conversation_id: convoId, direction: 'inbound', message: text },
    { expectedTenantId: tenant.id },
  )

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

  await insertConversationMessage(
    { conversation_id: convoId, direction: 'outbound', message: reply },
    { expectedTenantId: tenant.id },
  )

  const send = await sendTelegram(chatId, reply, botToken)
  if (!send.ok) {
    await logEvent(tenant.id, 'telegram_error', 'sendTelegram failed', `${send.status}: ${send.body.slice(0, 400)}`)
  }
  return NextResponse.json({ ok: true, send_ok: send.ok })
}
