import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { notify } from '@/lib/notify'
import { translateInboundComhubMessage } from '@/lib/comhub-translate'

// Public, unauthenticated web-chatbot widget endpoint. Tenant is resolved from
// the signed x-tenant-id header injected by middleware on the tenant host —
// same trust model as /api/public-upload. Anonymous visitors get their own
// comhub_contact (no phone/email required) and a channel='web' thread tagged
// ['chatbot', 'web chatbot'] so ComHub can tell this apart from the
// authenticated client-portal chat, which also uses channel='web'.

const WEBCHAT_TAGS = ['chatbot', 'web chatbot']
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

async function uploadChatImage(tenantId: string, threadId: string, dataUrl: string): Promise<string | null> {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl)
  if (!match) return null
  const [, mimeType, base64] = match
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType.toLowerCase())) return null

  const buffer = Buffer.from(base64, 'base64')
  if (buffer.byteLength > MAX_IMAGE_BYTES) return null

  const ext = mimeType.split('/')[1]?.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin'
  const path = `${tenantId}/webchat/${threadId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from('uploads')
    .upload(path, buffer, { contentType: mimeType, upsert: false })
  if (error) {
    console.error('[public/webchat] image upload failed:', error.message)
    return null
  }

  const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)
  return urlData.publicUrl
}

async function loadThread(tenantId: string, threadId: string) {
  const { data } = await supabaseAdmin
    .from('comhub_threads')
    .select('id, contact_id, tenant_id')
    .eq('id', threadId)
    .eq('tenant_id', tenantId)
    .eq('channel', 'web')
    .single()
  return data
}

export async function GET(req: NextRequest) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found for this host' }, { status: 404 })

  const threadId = req.nextUrl.searchParams.get('threadId')
  if (!threadId) return NextResponse.json({ messages: [] })

  const thread = await loadThread(tenant.id, threadId)
  if (!thread) return NextResponse.json({ error: 'Unknown chat session' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('comhub_messages')
    .select('id, direction, author, body, media_urls, sent_at')
    .eq('thread_id', threadId)
    .order('sent_at', { ascending: true })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Deliberately does NOT zero comhub_threads.unread_count here — that field
  // drives the admin's "needs a reply" badge in ComHub, and this route is
  // polled by the anonymous visitor's own browser, not an admin viewing it.
  return NextResponse.json({ threadId, messages: data || [] })
}

export async function POST(req: NextRequest) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found for this host' }, { status: 404 })

  const ip = clientIp(req)
  const rl = await rateLimitDb(`public_webchat:${tenant.id}:${ip}`, 30, 10 * 60 * 1000)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many messages. Try again later.' }, { status: 429 })

  const body = await req.json().catch(() => null) as {
    threadId?: string
    body?: string
    imageDataUrl?: string
    visitorName?: string
  } | null
  const text = body?.body?.trim() || ''
  if (!text && !body?.imageDataUrl) {
    return NextResponse.json({ error: 'Message or image required' }, { status: 400 })
  }

  let threadId = body?.threadId || null
  let contactId: string | null = null
  let isNewThread = false

  if (threadId) {
    const thread = await loadThread(tenant.id, threadId)
    if (!thread) return NextResponse.json({ error: 'Unknown chat session' }, { status: 404 })
    contactId = thread.contact_id
  } else {
    const { data: contact, error: contactErr } = await supabaseAdmin
      .from('comhub_contacts')
      .insert({ tenant_id: tenant.id, name: body?.visitorName?.trim().slice(0, 120) || null })
      .select('id')
      .single()
    if (contactErr || !contact) {
      return NextResponse.json({ error: contactErr?.message || 'Failed to start chat' }, { status: 500 })
    }
    contactId = contact.id

    const { data: newThreadId, error: threadErr } = await supabaseAdmin
      .rpc('comhub_get_or_create_thread', { p_tenant_id: tenant.id, p_contact_id: contactId, p_channel: 'web' })
    if (threadErr || !newThreadId) {
      return NextResponse.json({ error: threadErr?.message || 'Failed to start chat' }, { status: 500 })
    }
    threadId = newThreadId as string
    isNewThread = true

    await supabaseAdmin.from('comhub_threads').update({ tags: WEBCHAT_TAGS, name: 'Web Chatbot' }).eq('id', threadId)
  }

  let imageUrl: string | null = null
  if (body?.imageDataUrl) {
    imageUrl = await uploadChatImage(tenant.id, threadId, body.imageDataUrl)
    if (!imageUrl) return NextResponse.json({ error: 'Image upload failed — check file type/size (max 8MB)' }, { status: 400 })
  }

  const { data: msg, error: msgErr } = await supabaseAdmin
    .from('comhub_messages')
    .insert({
      tenant_id: tenant.id,
      thread_id: threadId,
      contact_id: contactId,
      channel: 'web',
      direction: 'in',
      author: 'customer',
      body: text || null,
      media_urls: imageUrl ? [imageUrl] : null,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (msgErr || !msg) return NextResponse.json({ error: msgErr?.message || 'Failed to send' }, { status: 500 })

  if (text) translateInboundComhubMessage(msg.id, text)

  await supabaseAdmin
    .from('comhub_threads')
    .update({
      last_message_at: msg.sent_at,
      last_message_preview: (text || 'Sent a photo').slice(0, 140),
      unread_count: 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', threadId)

  if (isNewThread) {
    await notify({
      tenantId: tenant.id,
      type: 'new_lead',
      title: 'New Web Chatbot Conversation',
      message: text ? text.slice(0, 140) : 'Visitor started a chat and shared a photo',
    }).catch(() => {})
  }

  return NextResponse.json({ threadId, contactId, messageId: msg.id, imageUrl })
}
