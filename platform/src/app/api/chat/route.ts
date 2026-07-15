import { NextRequest, NextResponse } from 'next/server'
import { askSelena, EMPTY_CHECKLIST, getNextStep, getQuickReplies } from '@/lib/selena-legacy'
import { askSelena as askYinez } from '@/lib/selena/agent'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import { rateLimitDb } from '@/lib/rate-limit-db'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, phone, tenantId: bodyTenantId } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Tenant must come from middleware-signed header. A caller-supplied
    // tenantId in the body is accepted only if it matches the signed header.
    // This closes the cross-tenant attack: POST /api/chat with body.tenantId
    // targeting any tenant would otherwise let an attacker impersonate them.
    const headerTenantId = req.headers.get('x-tenant-id')
    const sig = req.headers.get('x-tenant-sig')
    if (!headerTenantId || !verifyTenantHeaderSig(headerTenantId, sig)) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }
    if (bodyTenantId && bodyTenantId !== headerTenantId) {
      return NextResponse.json({ error: 'Tenant mismatch' }, { status: 400 })
    }
    const tenantId = headerTenantId

    // Unauthenticated + no rate limit == a scripted caller could loop this to
    // run up real Anthropic API spend and flood sms_conversation_messages.
    // Cap per tenant+IP; generous enough for a real back-and-forth chat.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`chat:${tenantId}:${ip}`, 20, 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    let conversationId = sessionId

    // A client-supplied sessionId must belong to THIS tenant's conversation.
    // Without this check, a visitor to tenantId's own site could pass any
    // other tenant's sms_conversations.id and the reused conversation would
    // run end-to-end as that foreign tenant: askYinez re-derives its entire
    // tenant context (Anthropic key, business config, client PII, message
    // history) purely from the conversation row's tenant_id, and the legacy
    // askSelena path reads/writes booking_checklist by conversationId alone
    // with no tenant filter. Same pattern as the /api/admin-chat and
    // /api/yinez fixes.
    if (conversationId) {
      const { data: owned } = await supabaseAdmin
        .from('sms_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!owned) conversationId = undefined
    }

    // Create conversation if new session
    if (!conversationId) {
      const webPhone = phone ? `web-${phone}` : `web-${crypto.randomUUID().slice(0, 8)}`
      const insertData: Record<string, unknown> = {
        phone: webPhone, state: 'active', tenant_id: tenantId,
        booking_checklist: { ...EMPTY_CHECKLIST, channel: 'web', phone: phone || null },
      }

      // If returning client, try to link to existing client record. Exact
      // national-number match only -- a substring ilike() with no length
      // floor let a short/garbage phone (e.g. a single digit) match an
      // ARBITRARY unrelated client in the tenant and misattribute their
      // identity onto this brand-new anonymous conversation; downstream tool
      // handlers (e.g. selena-legacy's capture-name path) then WRITE to that
      // wrong client's row keyed off this conversation's client_id. Same bug
      // class as the sibling getClientProfile fix.
      if (phone) {
        const nat = (d: string) => (d.length === 11 && d.startsWith('1') ? d.slice(1) : d)
        const normalizedPhone = nat(phone.replace(/\D/g, ''))
        if (normalizedPhone.length >= 10) {
          const { data: candidates } = await supabaseAdmin
            .from('clients')
            .select('id, name, phone')
            .eq('tenant_id', tenantId)
          const client = candidates?.find((c) => nat((c.phone || '').replace(/\D/g, '')) === normalizedPhone)
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
        tenantId,
        type: 'new_lead', title: phone ? 'Returning Client — Web Chat' : 'New Web Chat Lead',
        message: phone ? `Returning client (${phone}) started web chat` : 'New visitor started chat on website',
      }).catch(() => {})
    }

    // Log inbound
    await supabaseAdmin.from('sms_conversation_messages').insert({  // tenant-scope-ok: row-scoped by conversation_id (conversation is tenant-owned)
      conversation_id: conversationId, direction: 'inbound', message,
    })

    // NYC Maid runs the REAL Yinez agent (src/lib/selena/agent) — warm voice,
    // self-book redirect, memory/skills. Other tenants stay on the legacy
    // deterministic engine. Tenant-scoped parity (isNycMaid), not global.
    let reply: string
    let quickReplies: string[] = []
    let bookingCreated = false
    if (isNycMaid(tenantId)) {
      const yz = await askYinez('web', message, conversationId, phone || undefined)
      reply = yz.text || 'Something went wrong. Please try again or call us directly.'
      bookingCreated = !!yz.bookingCreated
    } else {
      const result = await askSelena(tenantId, 'web', message, conversationId, phone || undefined)
      reply = result.text || 'Something went wrong. Please try again or call us directly.'
      const checklist = result.checklist || EMPTY_CHECKLIST
      quickReplies = getQuickReplies(checklist, getNextStep(checklist))
      bookingCreated = !!result.bookingCreated
    }

    // Log outbound
    await supabaseAdmin.from('sms_conversation_messages').insert({  // tenant-scope-ok: row-scoped by conversation_id (conversation is tenant-owned)
      conversation_id: conversationId, direction: 'outbound',
      message: reply.replace(/\[ESCALATE[^\]]*\]/gi, '').trim(),
    })

    // Booking notification
    if (bookingCreated) {
      await notify({ tenantId, type: 'new_booking', title: 'New Web Booking', message: 'Client confirmed booking via web chat' }).catch(() => {})
    }

    return NextResponse.json({ reply, sessionId: conversationId, quickReplies })
  } catch (error) {
    console.error('[chat] Error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
