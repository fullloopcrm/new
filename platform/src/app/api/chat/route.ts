import { NextRequest, NextResponse } from 'next/server'
import { askSelena, EMPTY_CHECKLIST, getNextStep, getQuickReplies, getSelenaConfig } from '@/lib/selena-legacy'
import { askSelena as askYinez } from '@/lib/selena/agent'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { notify } from '@/lib/notify'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import { getSettings } from '@/lib/settings'

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

    let conversationId = sessionId

    // Create conversation if new session
    if (!conversationId) {
      const webPhone = phone ? `web-${phone}` : `web-${crypto.randomUUID().slice(0, 8)}`
      const insertData: Record<string, unknown> = {
        phone: webPhone, state: 'active', tenant_id: tenantId,
        booking_checklist: { ...EMPTY_CHECKLIST, channel: 'web', phone: phone || null },
      }

      // If returning client, try to link to existing client record
      if (phone) {
        const digits = phone.replace(/\D/g, '').slice(-10)
        const { data: clientData } = await tenantDb(tenantId)
          .from('clients')
          .select('id, name')
          .ilike('phone', `%${digits}%`)
          .limit(1).single()
        const client = clientData as unknown as { id: string; name: string } | null
        if (client) {
          insertData.client_id = client.id
          insertData.booking_checklist = {
            ...EMPTY_CHECKLIST, channel: 'web',
            phone, name: client.name,
          }
        }
      }

      const { data: convo } = await tenantDb(tenantId)
        .from('sms_conversations')
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
      // Pass the tenant's own service types + checklist config through so quick
      // replies stay trade-neutral — without these, getQuickReplies() falls back
      // to hardcoded cleaning-specific options ("Cleaning", "Deep clean", bed/bath
      // sizes) for every non-cleaning trade (towing, HVAC, plumbing, etc).
      const [config, settings] = await Promise.all([
        getSelenaConfig(tenantId),
        getSettings(tenantId),
      ])
      const serviceTypeNames = settings.service_types.filter(st => st.active).map(st => st.name)
      quickReplies = getQuickReplies(checklist, getNextStep(checklist, config), serviceTypeNames, config)
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
