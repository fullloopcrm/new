import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { sendSMS } from '@/lib/sms'
import { resolveTenantSmsCredentials } from '@/lib/sms-credentials'
import { isCommEnabled } from '@/lib/comms-prefs'

const MESSAGE_MAX_LENGTH = 1600

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    // Try client_sms_messages first
    const { data: messages, error } = await supabaseAdmin
      .from('client_sms_messages')
      .select('id, direction, message, created_at')
      .eq('client_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (messages && messages.length > 0) {
      return NextResponse.json(messages)
    }

    // Fallback: check sms_conversation_messages via sms_conversations
    const { data: conversations, error: convError } = await supabaseAdmin
      .from('sms_conversations')
      .select('id')
      .eq('client_id', id)
      .eq('tenant_id', tenantId)

    if (convError || !conversations || conversations.length === 0) {
      return NextResponse.json([])
    }

    const conversationIds = conversations.map((c) => c.id)

    const { data: fallbackMessages, error: fbError } = await supabaseAdmin
      .from('sms_conversation_messages')
      .select('id, direction, message, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: true })
      .limit(200)

    if (fbError) {
      return NextResponse.json({ error: fbError.message }, { status: 500 })
    }

    return NextResponse.json(fallbackMessages ?? [])
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: (e as any).status ?? 401 })
    }
    throw e
  }
}

// POST — admin/staff sends a manual outbound SMS to this client. Sends via the
// tenant's own Telnyx credentials (no platform fallback — see sms-credentials.ts
// on why every other manual-send caller keeps that gate) and logs the sent
// message into client_sms_messages so it appears in the transcript immediately.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.edit')
  if (authError) return authError

  try {
    const { tenantId, tenant: tenantRow } = tenant
    const { id } = await params
    const { message } = await request.json()

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }
    if (message.length > MESSAGE_MAX_LENGTH) {
      return NextResponse.json({ error: `message is too long (max ${MESSAGE_MAX_LENGTH} characters)` }, { status: 400 })
    }

    const enabled = await isCommEnabled(tenantId, 'manual_message', 'sms')
    if (!enabled) {
      return NextResponse.json(
        { error: 'SMS is turned off for this tenant in Communications settings' },
        { status: 403 },
      )
    }

    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, phone')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (clientError) {
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    if (!client.phone) {
      return NextResponse.json({ error: 'Client has no phone number on file' }, { status: 400 })
    }

    const smsCreds = resolveTenantSmsCredentials(tenantRow)
    if (!smsCreds.apiKey || !smsCreds.phone) {
      return NextResponse.json({ error: 'SMS is not configured for this tenant' }, { status: 400 })
    }

    try {
      await sendSMS({
        to: client.phone,
        body: message,
        telnyxApiKey: smsCreds.apiKey,
        telnyxPhone: smsCreds.phone,
      })
    } catch (smsErr) {
      const msg = smsErr instanceof Error ? smsErr.message : String(smsErr)
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const { data: saved, error: insertError } = await supabaseAdmin
      .from('client_sms_messages')
      .insert({
        tenant_id: tenantId,
        client_id: id,
        direction: 'outbound',
        message,
      })
      .select('id, direction, message, created_at')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ message: saved }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: (e as any).status ?? 401 })
    }
    throw e
  }
}
