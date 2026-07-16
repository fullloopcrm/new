import { NextRequest, NextResponse } from 'next/server'
import { askSelena, EMPTY_CHECKLIST, getNextStep, getQuickReplies } from '@/lib/selena-legacy'
import { askSelena as askYinez } from '@/lib/selena/agent'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import { rateLimitDb } from '@/lib/rate-limit-db'

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

    // Caller-supplied sessionId — verify it belongs to this tenant before
    // writing into it or handing it to askSelena/askYinez. Same FK-injection
    // class as the conversation_id trust bug already fixed on /api/sms,
    // /api/admin-chat, and sibling /api/yinez: a foreign sessionId would let
    // this tenant's public web widget read/append to, and have Selena act on,
    // another tenant's SMS conversation thread. Falls through to start a
    // fresh conversation (matching /api/yinez) rather than hard-erroring the
    // widget on a stale/foreign session id.
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

      // If returning client, try to link to existing client record. Full,
      // exact digit match only -- an ilike substring match on a short or
      // malformed phone (e.g. a single digit) would link this brand-new
      // anonymous conversation to an ARBITRARY unrelated client, leaking
      // their name and letting downstream Selena tool handlers write into
      // their record.
      if (phone) {
        const normalizedPhone = normalizePhoneDigits(phone)
        const { data: candidates } = normalizedPhone
          ? await supabaseAdmin
              .from('clients')
              .select('id, name, phone')
              .eq('tenant_id', tenantId)
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
