import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'

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
