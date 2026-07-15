import { NextRequest, NextResponse } from 'next/server'
import { askSelena } from '@/lib/selena/agent'
import { EMPTY_CHECKLIST } from '@/lib/selena/core'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/nycmaid/notify'
import { scoreConversation, selfReviewConversation } from '@/lib/nycmaid/conversation-scorer'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import { rateLimitDb } from '@/lib/rate-limit-db'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, phone } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // x-tenant-id is only trustworthy WITH its middleware-minted x-tenant-sig
    // companion — verify it the SAME way /api/chat + /api/errors do. This
    // route is public and unauthenticated (isPublicRoute skips Clerk on the
    // main host), so a raw forged x-tenant-id would otherwise select any
    // tenant and leak that tenant's client name via the phone lookup below.
    // An unsigned/forged value is dropped to undefined.
    const hdrTenantId = req.headers.get('x-tenant-id')
    const tenantSig = req.headers.get('x-tenant-sig')
    const reqTenantId = hdrTenantId && verifyTenantHeaderSig(hdrTenantId, tenantSig)
      ? hdrTenantId
      : undefined

    // Unauthenticated, invokes the Anthropic API per message — a scripted
    // caller could loop this to run up real API spend and flood
    // sms_conversation_messages. Cap per tenant(+"unverified" if unsigned)+IP.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`yinez:${reqTenantId || 'unverified'}:${ip}`, 20, 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    let conversationId = sessionId

    // A client-supplied sessionId must belong to THIS tenant's conversation.
    // Without this check, any caller could pass another tenant's
    // sms_conversations.id: resolveTenantForConversation() in
    // lib/selena/agent.ts derives the AI agent's entire tenant context — its
    // Anthropic key, business config, client PII, message history — purely
    // from the conversation row's tenant_id, not from the caller. This route
    // is fully unauthenticated, so an unverified sessionId reuse would let
    // anyone hijack any tenant's conversation end-to-end. If we have no
    // verified tenant context at all, we cannot prove ownership either, so
    // reuse is rejected and a fresh conversation is created instead.
    if (conversationId) {
      const owned = reqTenantId
        ? (await supabaseAdmin
            .from('sms_conversations')
            .select('id')
            .eq('id', conversationId)
            .eq('tenant_id', reqTenantId)
            .maybeSingle()).data
        : null
      if (!owned) conversationId = undefined
    }

    // Create conversation if new session
    if (!conversationId) {
      const webPhone = phone ? `web-${phone}` : `web-${crypto.randomUUID().slice(0, 8)}`
      const insertData: Record<string, unknown> = {
        phone: webPhone, state: 'active',
        booking_checklist: { ...EMPTY_CHECKLIST, channel: 'web', phone: phone || null },
      }

      // If returning client, try to link to existing client record.
      // No tenant context → skip linking rather than search globally.
      if (reqTenantId) insertData.tenant_id = reqTenantId
      if (phone && reqTenantId) {
        const digits = phone.replace(/\D/g, '').slice(-10)
        const { data: client } = await supabaseAdmin
          .from('clients')
          .select('id, name')
          .eq('tenant_id', reqTenantId)
          .ilike('phone', `%${digits}%`)
          .limit(1).single()
        if (client) {
          insertData.client_id = client.id
          insertData.booking_checklist = {
            ...EMPTY_CHECKLIST, channel: 'web',
            phone, name: client.name,
          }
        }
      }

      const { data: convo } = await supabaseAdmin
        .from('sms_conversations')  // tenant-scope-ok: insert payload carries tenant_id (built above)
        .insert(insertData)
        .select('id')
        .single()
      conversationId = convo?.id
      if (!conversationId) throw new Error('Failed to create conversation')

      await notify({
        type: 'new_lead', title: phone ? 'Returning Client — Web Chat' : 'New Web Chat Lead',
        message: phone ? `Returning client (${phone}) started web chat` : 'New visitor started chat on website',
      }).catch(() => {})
    }

    // Log inbound
    await supabaseAdmin.from('sms_conversation_messages').insert({  // tenant-scope-ok: row-scoped by conversation_id (conversation is tenant-owned)
      conversation_id: conversationId, direction: 'inbound', message,
    })

    const result = await askSelena('web', message, conversationId, phone || undefined)
    // No canned dead-end. Empty reply surfaces as "no response" to the widget,
    // and the agent.ts catch already notifies admin so we know there's a gap.
    const reply = result.text || ''

    // Log outbound
    await supabaseAdmin.from('sms_conversation_messages').insert({  // tenant-scope-ok: row-scoped by conversation_id (conversation is tenant-owned)
      conversation_id: conversationId, direction: 'outbound', message: reply.replace(/\[ESCALATE[^\]]*\]/gi, '').trim(),
    })

    if (result.bookingCreated) {
      await notify({ type: 'new_booking', title: 'New Web Booking', message: 'Client confirmed booking via web chat' }).catch(() => {})
      // Match the SMS path: score + self-review after a successful conversation end so
      // Yinez learns from EVERY channel, not just SMS. Fire-and-forget, never blocks reply.
      scoreConversation(conversationId).catch(() => {})
      selfReviewConversation(conversationId).catch(() => {})
    }

    return NextResponse.json({ reply, sessionId: conversationId, quickReplies: [] })
  } catch (error) {
    console.error('[chat] Error:', error)
    await notify({ type: 'yinez_error', title: 'Yinez Web Chat Error', message: `${error instanceof Error ? error.message : String(error)}` }).catch(() => {})
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
