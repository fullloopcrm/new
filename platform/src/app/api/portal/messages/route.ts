import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../auth/token'
import { translateInboundComhubMessage } from '@/lib/comhub-translate'
import { notify } from '@/lib/notify'

// Same Bearer-token session the rest of the current portal (e.g. /api/portal/connect)
// uses. protectClientAPI()'s client_session cookie is never set by the current PIN
// login flow (/api/portal/auth returns a signed token, not a cookie) — this route
// previously used that dead check and could never actually authenticate a request.
function authenticate(req: NextRequest): { clientId: string } | NextResponse {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  return { clientId: auth.id }
}

async function getClientThreadId(clientId: string): Promise<{ tenantId: string | null; contactId: string | null; threadId: string | null; clientName: string | null }> {
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('phone, email, name, tenant_id')
    .eq('id', clientId)
    .single()
  if (!client) return { tenantId: null, contactId: null, threadId: null, clientName: null }
  const tenantId = client.tenant_id
  const db = tenantDb(tenantId)

  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data: existing } = (await db
    .from('comhub_contacts')
    .select('id')
    .eq('client_id', clientId)
    .limit(1)) as { data: { id: string }[] | null }
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
      if (contactId) await db.from('comhub_contacts').update({ client_id: clientId }).eq('id', contactId)
    }
  }
  if (!contactId) return { tenantId, contactId: null, threadId: null, clientName: client.name }

  const { data: tId } = await supabaseAdmin
    .rpc('comhub_get_or_create_thread', { p_tenant_id: tenantId, p_contact_id: contactId, p_channel: 'web' })
  return { tenantId, contactId, threadId: (tId as string) || null, clientName: client.name }
}

export async function GET(req: NextRequest) {
  const auth = authenticate(req)
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth

  const { tenantId, threadId } = await getClientThreadId(clientId)
  if (!threadId || !tenantId) return NextResponse.json({ messages: [] })
  const db = tenantDb(tenantId)

  const { data, error } = await db
    .from('comhub_messages')
    .select('id, direction, author, body, sent_at, channel')
    .eq('thread_id', threadId)
    .order('sent_at', { ascending: true })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('comhub_threads').update({ unread_count: 0 }).eq('id', threadId)
  return NextResponse.json({ thread_id: threadId, messages: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req)
  if (auth instanceof NextResponse) return auth
  const { clientId } = auth

  const body = await req.json().catch(() => null) as { body?: string } | null
  if (!body?.body?.trim()) return NextResponse.json({ error: 'body required' }, { status: 400 })

  const { tenantId, contactId, threadId, clientName } = await getClientThreadId(clientId)
  if (!tenantId || !contactId || !threadId) return NextResponse.json({ error: 'no client thread' }, { status: 500 })
  const db = tenantDb(tenantId)

  const { data: msg, error } = await db
    .from('comhub_messages')
    .insert({
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

  translateInboundComhubMessage(msg.id, body.body.trim())

  await db
    .from('comhub_threads')
    .update({
      last_message_at: msg.sent_at,
      last_message_preview: body.body.trim().slice(0, 140),
      unread_count: 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', threadId)

  await notify({
    tenantId,
    type: 'sms_received',
    title: `New Portal Message from ${clientName || 'a client'}`,
    message: body.body.trim(),
  }).catch(() => {})

  return NextResponse.json({ ok: true, message_id: msg.id })
}
