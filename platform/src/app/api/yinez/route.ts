import { NextRequest, NextResponse } from 'next/server'
import { askSelena } from '@/lib/selena/agent'
import { EMPTY_CHECKLIST } from '@/lib/selena/core'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/nycmaid/notify'
import { scoreConversation, selfReviewConversation } from '@/lib/nycmaid/conversation-scorer'
import { insertConversationMessage } from '@/lib/sms-messages'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'

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

    let conversationId = sessionId

    // Create conversation if new session
    if (!conversationId) {
      const webPhone = phone ? `web-${phone}` : `web-${crypto.randomUUID().slice(0, 8)}`
      const insertData: Record<string, unknown> = {
        phone: webPhone, state: 'active',
        booking_checklist: { ...EMPTY_CHECKLIST, channel: 'web', phone: phone || null },
        tenant_id: reqTenantId,
      }

      // If returning client, try to link to existing client record.
      if (phone) {
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
    await insertConversationMessage({ conversation_id: conversationId, direction: 'inbound', message })

    const result = await askSelena('web', message, conversationId, phone || undefined)
    // No canned dead-end. Empty reply surfaces as "no response" to the widget,
    // and the agent.ts catch already notifies admin so we know there's a gap.
    const reply = result.text || ''

    // Log outbound
    await insertConversationMessage({
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
