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
    // with no tenant filter. Same pattern as the /api/admin-chat fix
    // (e8052fb1) and the /api/yinez fix alongside this one.
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
      // national-number match only (no ilike substring) — this endpoint is
      // fully unauthenticated, so a short/garbage `phone` (e.g. "5") must
      // never resolve to an arbitrary client: downstream Selena tool
      // handlers (e.g. capture-name) WRITE to `clients` keyed off this
      // client_id, so a false match is a corruption vector, not just a read.
      const digits = phone ? phone.replace(/\D/g, '') : ''
      if (digits.length >= 10) {
        const nat = (d: string) => (d.length === 11 && d.startsWith('1') ? d.slice(1) : d)
        const target = nat(digits)
        const { data: candidates } = await supabaseAdmin
          .from('clients')
          .select('id, name, phone')
          .eq('tenant_id', tenantId)
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

    // Log inbound. tenant_id is stamped explicitly — an unstamped insert
    // falls back to sms_conversation_messages' column DEFAULT ('nycmaid',
    // the rollout safety net from 2026_05_09_tenant_id_core.sql), which
    // mis-tags every OTHER tenant's message as nycmaid's. That mis-tag then
    // hides the message from that tenant's own tenant-scoped GET ?convoId
    // read (self-visibility bug), and — since the row's real tenant_id ends
    // up 'nycmaid' rather than NULL — makes it visible to a nycmaid operator
    // who already knows the foreign conversation id. Same gap already fixed
    // on the selena reset-insert sibling (see route.reset-insert-tenant-tag
    // witness test); tracked as P2 "write-side siblings" in
    // deploy-prep/idor-remediation-status.md.
    await supabaseAdmin.from('sms_conversation_messages').insert({
      conversation_id: conversationId, direction: 'inbound', message, tenant_id: tenantId,
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

    // Log outbound — tenant_id stamped, same reasoning as the inbound insert above.
    await supabaseAdmin.from('sms_conversation_messages').insert({
      conversation_id: conversationId, direction: 'outbound',
      message: reply.replace(/\[ESCALATE[^\]]*\]/gi, '').trim(), tenant_id: tenantId,
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
