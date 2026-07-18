import { NextRequest, NextResponse } from 'next/server'
import { askSelena, isOwnerOfTenant } from '@/lib/selena/agent'
import { EMPTY_CHECKLIST } from '@/lib/selena/core'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/nycmaid/notify'
import { scoreConversation, selfReviewConversation } from '@/lib/nycmaid/conversation-scorer'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import { rateLimitDb } from '@/lib/rate-limit-db'

export const maxDuration = 60

// Same risk/convention as admin/translate's MAX_TEXT_LENGTH (and the sibling
// fix on ai/chat, ai/assistant, /api/chat): this endpoint is fully
// unauthenticated and rate-limited on call *volume* only (below), not
// payload size. Without this cap, one request with an oversized `message`
// still counts as a single call against the 20/min limit while driving
// arbitrarily large, real Anthropic spend against the tenant's (or
// platform's) stored key.
const MAX_MESSAGE_LENGTH = 4000

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, phone: rawPhone } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message too long — max ${MAX_MESSAGE_LENGTH} characters` }, { status: 400 })
    }

    // x-tenant-id is only trustworthy WITH its middleware-minted x-tenant-sig
    // companion — verify it the SAME way /api/chat + /api/errors do. A raw
    // forged x-tenant-id on a main-host request would otherwise select any
    // tenant. An unsigned/forged value is dropped to undefined.
    const hdrTenantId = req.headers.get('x-tenant-id')
    const tenantSig = req.headers.get('x-tenant-sig')
    const reqTenantId = hdrTenantId && verifyTenantHeaderSig(hdrTenantId, tenantSig)
      ? hdrTenantId
      : undefined

    // This endpoint is fully unauthenticated — a self-reported `phone` proves
    // nothing about who's actually typing (unlike the SMS/Telnyx channel,
    // where `from` is the carrier-verified sender). askSelena feeds this same
    // phone into isOwnerOfTenant() to decide whether the caller gets
    // owner-gated tools (Stripe refunds, SMS broadcasts, revenue, settings).
    // Without this check, anyone who knows or guesses the tenant's
    // registered owner_phone could paste it into the public chat widget's
    // request body and be granted full admin-tool access with zero
    // authentication. Only checkable with a verified tenant (an unverified
    // request already forgoes tenant-scoped linking below).
    const phone = rawPhone && reqTenantId && (await isOwnerOfTenant(rawPhone, reqTenantId)) ? undefined : rawPhone

    // Same cost-abuse exposure as /api/chat: unauthenticated, invokes the
    // Anthropic API per message. Cap per tenant(+"unknown" if unverified)+IP.
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
      // Exact national-number match only (no ilike substring) — this
      // endpoint is fully unauthenticated, so a short/garbage `phone` must
      // never resolve to an arbitrary client (write-corruption vector via
      // client_id, same as /api/chat).
      if (phone && reqTenantId) {
        const digits = phone.replace(/\D/g, '')
        if (digits.length >= 10) {
          const nat = (d: string) => (d.length === 11 && d.startsWith('1') ? d.slice(1) : d)
          const target = nat(digits)
          const { data: candidates } = await supabaseAdmin
            .from('clients')
            .select('id, name, phone')
            .eq('tenant_id', reqTenantId)
          const client = (candidates || []).find(c => {
            const cDigits = nat((c.phone || '').replace(/\D/g, ''))
            return cDigits.length >= 10 && cDigits === target
          })
          if (client) {
            insertData.client_id = client.id
            insertData.booking_checklist = {
              ...EMPTY_CHECKLIST, channel: 'web',
              phone, name: client.name,
            }
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

    // Log inbound. Stamp tenant_id when verified — an unstamped insert falls
    // back to sms_conversation_messages' column DEFAULT ('nycmaid', the
    // rollout safety net from 2026_05_09_tenant_id_core.sql), which mis-tags
    // every OTHER tenant's message as nycmaid's and hides it from that
    // tenant's own tenant-scoped GET ?convoId read. Same gap already fixed on
    // the selena reset-insert sibling; tracked as P2 "write-side siblings" in
    // deploy-prep/idor-remediation-status.md. Omit when unverified (matches
    // the conversation row's own untagged state for that case, above).
    await supabaseAdmin.from('sms_conversation_messages').insert({
      conversation_id: conversationId, direction: 'inbound', message,
      ...(reqTenantId ? { tenant_id: reqTenantId } : {}),
    })

    const result = await askSelena('web', message, conversationId, phone || undefined)
    // No canned dead-end. Empty reply surfaces as "no response" to the widget,
    // and the agent.ts catch already notifies admin so we know there's a gap.
    const reply = result.text || ''

    // Log outbound — tenant_id stamped (when verified), same reasoning as the inbound insert above.
    await supabaseAdmin.from('sms_conversation_messages').insert({
      conversation_id: conversationId, direction: 'outbound', message: reply.replace(/\[ESCALATE[^\]]*\]/gi, '').trim(),
      ...(reqTenantId ? { tenant_id: reqTenantId } : {}),
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
