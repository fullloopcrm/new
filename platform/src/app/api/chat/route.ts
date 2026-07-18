import { NextRequest, NextResponse } from 'next/server'
import { askSelena, EMPTY_CHECKLIST, getNextStep, getQuickReplies } from '@/lib/selena-legacy'
import { askSelena as askYinez, normalizePhoneDigits } from '@/lib/selena/agent'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { tenantDb } from '@/lib/tenant-db'
import { notify } from '@/lib/notify'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import { insertConversationMessage } from '@/lib/sms-messages'
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
    // Auto-scoping wrapper: select/insert on tenant-owned tables are forced to
    // this tenant, so tenant_id can't be forgotten or forged (P1 hardening).
    const db = tenantDb(tenantId)

    // Every message here triggers a real, billed Anthropic API call
    // (askSelena/askYinez below) against the tenant's OWN key when set
    // (resolveAnthropic) — unlike the platform-level marketing forms already
    // rate-limited this session, an unauthenticated flood here doesn't just
    // spam DB rows/notifications, it burns the TENANT's own LLM spend with no
    // volume gate at all. 20/10min is generous for a real multi-turn
    // conversation (the SMS/web chat flow rarely exceeds a dozen turns) while
    // still bounding a scripted flood. Keyed per tenant+ip, same convention
    // as contact/client-book/reviews-upload.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`chat:${tenantId}:${ip}`, 20, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many messages. Please wait a few minutes.' }, { status: 429 })
    }

    let conversationId = sessionId

    // Create conversation if new session
    if (!conversationId) {
      const webPhone = phone ? `web-${phone}` : `web-${crypto.randomUUID().slice(0, 8)}`
      const insertData: Record<string, unknown> = {
        phone: webPhone, state: 'active',
        booking_checklist: { ...EMPTY_CHECKLIST, channel: 'web', phone: phone || null },
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
          const { data: candidates } = await db
            .from('clients')
            .select('id, name, phone')
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

      const { data: convo } = await db
        .from('sms_conversations')  // tenant_id stamped by tenantDb wrapper
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
    await insertConversationMessage(
      { conversation_id: conversationId, direction: 'inbound', message },
      { expectedTenantId: tenantId },
    )

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
    await insertConversationMessage(
      {
        conversation_id: conversationId, direction: 'outbound',
        message: reply.replace(/\[ESCALATE[^\]]*\]/gi, '').trim(),
      },
      { expectedTenantId: tenantId },
    )

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
