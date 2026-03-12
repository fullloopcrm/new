import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'

// GET /api/sms
// ?conversation_id=X  → messages for that conversation
// otherwise           → list of conversations with client info
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const conversationId = request.nextUrl.searchParams.get('conversation_id')

    if (conversationId) {
      // Return messages for a specific conversation
      const { data: messages, error } = await supabaseAdmin
        .from('sms_conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Verify conversation belongs to this tenant
      const { data: convo } = await supabaseAdmin
        .from('sms_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .single()

      if (!convo) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      return NextResponse.json({ messages: messages || [] })
    }

    // Return conversations list with client info
    const { data: conversations, error } = await supabaseAdmin
      .from('sms_conversations')
      .select('*, clients(name, phone)')
      .eq('tenant_id', tenantId)
      .order('last_message_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ conversations: conversations || [] })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

// POST /api/sms
// Body: { conversation_id?, client_id, message }
export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json()
    const { conversation_id, client_id, message } = body

    if (!client_id || !message) {
      return NextResponse.json(
        { error: 'client_id and message are required' },
        { status: 400 },
      )
    }

    let convoId = conversation_id

    // Look up or create conversation if none provided
    if (!convoId) {
      const { data: existing } = await supabaseAdmin
        .from('sms_conversations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('client_id', client_id)
        .is('completed_at', null)
        .eq('expired', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existing) {
        convoId = existing.id
      } else {
        // Get client phone for new conversation
        const { data: client } = await supabaseAdmin
          .from('clients')
          .select('phone')
          .eq('id', client_id)
          .eq('tenant_id', tenantId)
          .single()

        const cleanPhone = client?.phone?.replace(/\D/g, '').slice(-10) || ''

        const { data: newConvo, error: createError } = await supabaseAdmin
          .from('sms_conversations')
          .insert({
            tenant_id: tenantId,
            client_id,
            phone: cleanPhone,
          })
          .select('id')
          .single()

        if (createError) {
          return NextResponse.json({ error: createError.message }, { status: 500 })
        }

        convoId = newConvo.id
      }
    }

    // Insert outbound message
    const now = new Date().toISOString()
    const { data: msg, error: msgError } = await supabaseAdmin
      .from('sms_conversation_messages')
      .insert({
        conversation_id: convoId,
        direction: 'outbound',
        message,
      })
      .select()
      .single()

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Update last_message_at on conversation
    await supabaseAdmin
      .from('sms_conversations')
      .update({ last_message_at: now })
      .eq('id', convoId)

    // Try to send via Telnyx if tenant has it configured
    let sent = false
    try {
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('telnyx_api_key, telnyx_phone')
        .eq('id', tenantId)
        .single()

      if (tenant?.telnyx_api_key && tenant?.telnyx_phone) {
        // Get client phone number
        const { data: client } = await supabaseAdmin
          .from('clients')
          .select('phone')
          .eq('id', client_id)
          .eq('tenant_id', tenantId)
          .single()

        if (client?.phone) {
          await sendSMS({
            to: client.phone,
            body: message,
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          })
          sent = true
        }
      }
    } catch {
      // Telnyx send failure shouldn't break the API response
      console.error('Failed to send SMS via Telnyx')
    }

    return NextResponse.json({ message: msg, sent }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
