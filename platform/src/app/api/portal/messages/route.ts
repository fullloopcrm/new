import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { protectClientAPI } from '@/lib/nycmaid/auth'

const MAX_MESSAGE_LENGTH = 4000

async function getClientThreadId(clientId: string): Promise<{ tenantId: string | null; contactId: string | null; threadId: string | null }> {
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('phone, email, name, tenant_id')
    .eq('id', clientId)
    .single()
  if (!client) return { tenantId: null, contactId: null, threadId: null }
  const tenantId = client.tenant_id

  const { data: existing } = await supabaseAdmin
    .from('comhub_contacts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .limit(1)
  let contactId = existing && existing[0]?.id || null

  if (!contactId) {
    if (client.phone) {
      const { data } = await supabaseAdmin
        .rpc('comhub_get_or_create_contact_by_phone', {
          p_tenant_id: tenantId, p_phone: client.phone, p_name: client.name, p_client_id: clientId,
        })
      contactId = (data as string) || null
    } else if (client.email) {
      const { data } = await supabaseAdmin
        .rpc('comhub_get_or_create_contact_by_email', {
          p_tenant_id: tenantId, p_email: client.email, p_name: client.name,
        })
      contactId = (data as string) || null
      if (contactId) await supabaseAdmin.from('comhub_contacts').update({ client_id: clientId }).eq('id', contactId)
    }
  }
  if (!contactId) return { tenantId, contactId: null, threadId: null }

  const { data: tId } = await supabaseAdmin
    .rpc('comhub_get_or_create_thread', { p_tenant_id: tenantId, p_contact_id: contactId, p_channel: 'web' })
  return { tenantId, contactId, threadId: (tId as string) || null }
}

export async function GET() {
  const auth = await protectClientAPI()
  if ('error' in auth || !('clientId' in auth)) return auth as NextResponse
  const { clientId } = auth

  const { threadId } = await getClientThreadId(clientId)
  if (!threadId) return NextResponse.json({ messages: [] })

  const { data, error } = await supabaseAdmin
    .from('comhub_messages')
    .select('id, direction, author, body, sent_at, channel')
    .eq('thread_id', threadId)
    .order('sent_at', { ascending: true })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('comhub_threads').update({ unread_count: 0 }).eq('id', threadId)
  return NextResponse.json({ thread_id: threadId, messages: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await protectClientAPI()
  if ('error' in auth || !('clientId' in auth)) return auth as NextResponse
  const { clientId } = auth

  const body = await req.json().catch(() => null) as { body?: string } | null
  if (!body?.body?.trim()) return NextResponse.json({ error: 'body required' }, { status: 400 })
  if (body.body.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Message too long — max ${MAX_MESSAGE_LENGTH} characters` }, { status: 400 })
  }

  const { tenantId, contactId, threadId } = await getClientThreadId(clientId)
  if (!tenantId || !contactId || !threadId) return NextResponse.json({ error: 'no client thread' }, { status: 500 })

  const { data: msg, error } = await supabaseAdmin
    .from('comhub_messages')
    .insert({
      tenant_id: tenantId,
      thread_id: threadId,
      contact_id: contactId,
      channel: 'web',
      direction: 'in',
      author: 'customer',
      body: body.body.trim(),
      sent_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin
    .from('comhub_threads')
    .update({
      last_message_at: msg.sent_at,
      last_message_preview: body.body.trim().slice(0, 140),
      unread_count: 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', threadId)

  return NextResponse.json({ ok: true, message_id: msg.id })
}
