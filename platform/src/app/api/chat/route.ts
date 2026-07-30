import { NextRequest, NextResponse } from 'next/server'
import { EMPTY_CHECKLIST } from '@/lib/selena-legacy'
import { askSelena as askYinez } from '@/lib/selena/agent'
import { tenantDb } from '@/lib/tenant-db'
import { notify } from '@/lib/notify'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import { insertConversationMessage } from '@/lib/sms-messages'

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

    let conversationId = sessionId

    // Create conversation if new session
    if (!conversationId) {
      const webPhone = phone ? `web-${phone}` : `web-${crypto.randomUUID().slice(0, 8)}`
      const insertData: Record<string, unknown> = {
        phone: webPhone, state: 'active',
        booking_checklist: { ...EMPTY_CHECKLIST, channel: 'web', phone: phone || null },
      }

      // If returning client, try to link to existing client record. If a
      // phone was given but matches no client, this visitor gave us a real
      // contact point and got NOTHING before this fix — no client, no
      // portal_lead, no sales deal, just the conversation log and a
      // fire-and-forget notification (2026-07-30 pipeline trace finding).
      // Give them the same real lead record every other intake source gets.
      let isNewLead = false
      if (phone) {
        const digits = phone.replace(/\D/g, '').slice(-10)
        const { data: client } = await db
          .from('clients')
          .select('id, name')
          .ilike('phone', `%${digits}%`)
          .limit(1).single()
        if (client) {
          insertData.client_id = client.id
          insertData.booking_checklist = {
            ...EMPTY_CHECKLIST, channel: 'web',
            phone, name: client.name,
          }
        } else {
          try {
            const { createLeadAndEnterPipeline } = await import('@/lib/lead-intake')
            const result = await createLeadAndEnterPipeline(tenantId, {
              phone, source: 'web-chat', notes: `Started web chat with phone ${phone}`,
            })
            insertData.client_id = result.clientId
            insertData.booking_checklist = { ...EMPTY_CHECKLIST, channel: 'web', phone }
            isNewLead = true
          } catch (leadErr) {
            console.error('[chat] lead creation failed:', leadErr)
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
        type: 'new_lead',
        title: isNewLead ? 'New Lead — Web Chat' : phone ? 'Returning Client — Web Chat' : 'New Web Chat Lead',
        message: isNewLead
          ? `New lead (${phone}) started web chat — added to Sales`
          : phone ? `Returning client (${phone}) started web chat` : 'New visitor started chat on website',
      }).catch(() => {})
    }

    // Log inbound
    await insertConversationMessage(
      { conversation_id: conversationId, direction: 'inbound', message },
      { expectedTenantId: tenantId },
    )

    // Every tenant runs the shared Yinez agent (src/lib/selena/agent) — warm
    // voice, self-book redirect, memory/skills. NYC Maid via her own verbatim
    // playbook, every other tenant via the config-driven one. Pass tenantId
    // explicitly (already resolved above from the signed header).
    const quickReplies: string[] = []
    const yz = await askYinez('web', message, conversationId, phone || undefined, undefined, tenantId)
    const reply = yz.text || 'Something went wrong. Please try again or call us directly.'
    const bookingCreated = !!yz.bookingCreated

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
