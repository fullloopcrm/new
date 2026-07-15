import { NextRequest, NextResponse } from 'next/server'
import { askSelena } from '@/lib/selena/agent'
import { EMPTY_CHECKLIST } from '@/lib/selena/core'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/nycmaid/notify'
import { scoreConversation, selfReviewConversation } from '@/lib/nycmaid/conversation-scorer'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'

export const maxDuration = 60

// National (US) 10-digit number with an optional leading country-code '1'
// stripped from either side -- returns null for anything shorter (a short or
// malformed phone must never resolve to an existing client).
function normalizePhoneDigits(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  return national.length === 10 ? national : null
}

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, phone } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // TENANT WALL: only trust x-tenant-id together with its middleware-minted
    // x-tenant-sig companion — verify it the SAME way /api/chat + /api/errors
    // do. Computed up front because it also gates conversation *reuse* below,
    // not just creation.
    const hdrTenantId = req.headers.get('x-tenant-id')
    const tenantSig = req.headers.get('x-tenant-sig')
    const reqTenantId = hdrTenantId && verifyTenantHeaderSig(hdrTenantId, tenantSig)
      ? hdrTenantId
      : undefined

    let conversationId = sessionId

    // A caller-supplied sessionId is otherwise trusted with zero ownership
    // check: askSelena() resolves ALL downstream tool/data access purely from
    // sms_conversations.tenant_id for this id (resolveTenantForConversation
    // in lib/selena/agent.ts). Without this check, this fully-unauthenticated
    // public widget endpoint would let anyone pass another tenant's
    // conversation id and get Selena to load/act on THAT tenant's
    // bookings/clients, plus write into their conversation transcript.
    if (conversationId) {
      const { data: existingConvo } = await supabaseAdmin
        .from('sms_conversations')
        .select('id, tenant_id')
        .eq('id', conversationId)
        .maybeSingle()
      if (!existingConvo || (existingConvo.tenant_id || null) !== (reqTenantId || null)) {
        conversationId = undefined
      }
    }

    // Create conversation if new session
    if (!conversationId) {
      const webPhone = phone ? `web-${phone}` : `web-${crypto.randomUUID().slice(0, 8)}`
      const insertData: Record<string, unknown> = {
        phone: webPhone, state: 'active',
        booking_checklist: { ...EMPTY_CHECKLIST, channel: 'web', phone: phone || null },
      }

      // If returning client, try to link to existing client record.
      // An unsigned/forged tenant header is dropped to undefined, so the
      // insert stays tenant-less and the tenant-scope guard rejects it rather
      // than scoping the conversation to an attacker's target. No tenant
      // context → skip linking rather than search globally.
      if (reqTenantId) insertData.tenant_id = reqTenantId
      if (phone && reqTenantId) {
        // Full, exact digit match only -- an ilike substring match on a
        // short or malformed phone (e.g. a single digit) would link this
        // brand-new anonymous conversation to an ARBITRARY unrelated
        // client, leaking their name and letting downstream Selena tool
        // handlers write into their record.
        const normalizedPhone = normalizePhoneDigits(phone)
        const { data: candidates } = normalizedPhone
          ? await supabaseAdmin
              .from('clients')
              .select('id, name, phone')
              .eq('tenant_id', reqTenantId)
          : { data: null }
        const client = candidates?.find((c) => normalizePhoneDigits(c.phone || '') === normalizedPhone)
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
