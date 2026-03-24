import { NextRequest, NextResponse } from 'next/server'
import { askSelena, EMPTY_CHECKLIST, getNextStep, getQuickReplies } from '@/lib/selena'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, phone, tenantId } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

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
        const { data: client } = await supabaseAdmin
          .from('clients')
          .select('id, name')
          .eq('tenant_id', tenantId)
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
    await supabaseAdmin.from('sms_conversation_messages').insert({
      conversation_id: conversationId, direction: 'inbound', message,
    })

    // Ask Selena (tenant-aware)
    const result = await askSelena(tenantId, 'web', message, conversationId, phone || undefined)
    const reply = result.text || 'Something went wrong. Please try again or call us directly.'

    // Log outbound
    await supabaseAdmin.from('sms_conversation_messages').insert({
      conversation_id: conversationId, direction: 'outbound',
      message: reply.replace(/\[ESCALATE[^\]]*\]/gi, '').trim(),
    })

    // Quick replies from state machine
    const checklist = result.checklist || EMPTY_CHECKLIST
    const nextStep = getNextStep(checklist)
    const quickReplies = getQuickReplies(checklist, nextStep)

    // Booking notification
    if (result.bookingCreated) {
      await notify({ tenantId, type: 'new_booking', title: 'New Web Booking', message: 'Client confirmed booking via web chat' }).catch(() => {})
    }

    return NextResponse.json({ reply, sessionId: conversationId, quickReplies })
  } catch (error) {
    console.error('[chat] Error:', error)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
