import { NextRequest, NextResponse } from 'next/server'
import { askSelena, normalizePhoneDigits } from '@/lib/selena/agent'
import { EMPTY_CHECKLIST } from '@/lib/selena/core'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/nycmaid/notify'
import { scoreConversation, selfReviewConversation } from '@/lib/nycmaid/conversation-scorer'
import { insertConversationMessage } from '@/lib/sms-messages'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import { rateLimitDb } from '@/lib/rate-limit-db'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, phone } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Tenant must come from the middleware-signed header — same guard as
    // chat/route.ts. Without this, a raw x-tenant-id header lets an attacker
    // impersonate any tenant and pull back a client's name by phone number.
    const headerTenantId = req.headers.get('x-tenant-id')
    const sig = req.headers.get('x-tenant-sig')
    if (!headerTenantId || !verifyTenantHeaderSig(headerTenantId, sig)) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }
    const reqTenantId = headerTenantId

    // Same class of gap as chat/route.ts: every message here triggers a real,
    // billed Anthropic API call (askSelena below) against nycmaid's own key —
    // an unauthenticated flood burns real LLM spend with no volume gate at
    // all. Same 20/10min bound and tenant+ip key convention as chat/route.ts.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`yinez-chat:${reqTenantId}:${ip}`, 20, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many messages. Please wait a few minutes.' }, { status: 429 })
    }

    let conversationId = sessionId

    // A caller-supplied sessionId is an unauthenticated, attacker-controlled
    // external id — same action-authorization-bypass class as the Telnyx
    // call_control_id hijack (comhub/voice/control). askSelena()/
    // insertConversationMessage() both resolve tenant from the conversation's
    // OWN row (by design, so a conversation stays with its real owner), not
    // from reqTenantId — so without this check, supplying another tenant's
    // live sessionId here injects a message into, and drives Selena's reply/
    // tool-calls against, THAT tenant's real customer conversation. Verify
    // ownership before it's used for anything.
    if (conversationId) {
      const { data: owned } = await supabaseAdmin
        .from('sms_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('tenant_id', reqTenantId)
        .maybeSingle()
      if (!owned) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
      }
    }

    // Create conversation if new session
    if (!conversationId) {
      const webPhone = phone ? `web-${phone}` : `web-${crypto.randomUUID().slice(0, 8)}`
      const insertData: Record<string, unknown> = {
        phone: webPhone, state: 'active',
        booking_checklist: { ...EMPTY_CHECKLIST, channel: 'web', phone: phone || null },
        tenant_id: reqTenantId,
      }

      // If returning client, try to link to existing client record. Exact
      // national-number match only -- a substring ilike() with no length
      // floor let a short/garbage phone match an ARBITRARY unrelated client
      // in the tenant and misattribute their identity onto this brand-new
      // anonymous conversation; downstream tool handlers then WRITE to that
      // wrong client's row keyed off this conversation's client_id.
      if (phone) {
        const normalizedPhone = normalizePhoneDigits(phone)
        if (normalizedPhone) {
          const { data: candidates } = await supabaseAdmin
            .from('clients')
            .select('id, name, phone')
            .eq('tenant_id', reqTenantId)
          const client = candidates?.find((c: { phone?: string }) => normalizePhoneDigits(c.phone || '') === normalizedPhone)
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

    // Log inbound
    await insertConversationMessage(
      { conversation_id: conversationId, direction: 'inbound', message },
      { expectedTenantId: reqTenantId },
    )

    const result = await askSelena('web', message, conversationId, phone || undefined)
    // No canned dead-end. Empty reply surfaces as "no response" to the widget,
    // and the agent.ts catch already notifies admin so we know there's a gap.
    const reply = result.text || ''

    // Log outbound
    await insertConversationMessage(
      {
        conversation_id: conversationId, direction: 'outbound', message: reply.replace(/\[ESCALATE[^\]]*\]/gi, '').trim(),
      },
      { expectedTenantId: reqTenantId },
    )

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
