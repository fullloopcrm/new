import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { notify } from '@/lib/notify'
import { translateInboundComhubMessage } from '@/lib/comhub-translate'
import { trackError } from '@/lib/error-tracking'
import { lookupIpGeo } from '@/lib/comhub-ip-geo'

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

// Same shape as /api/chat's new-visitor lead creation: match an existing
// client by phone, or create a real client (+ portal_lead + deal, via
// createLeadAndEnterPipeline) so a webchat visitor who gives their name and
// phone gets the same real client record every other intake channel gives
// them — not just a comhub_contacts row nobody but ComHub ever sees.
async function resolveClientIdForPhone(tenantId: string, phone: string, name: string | null): Promise<string | null> {
  const digits = phone.replace(/\D/g, '').slice(-10)
  if (digits.length < 7) return null

  const { data: existing } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('phone', `%${digits}%`)
    .limit(1)
    .single()
  if (existing) return existing.id

  try {
    const { createLeadAndEnterPipeline } = await import('@/lib/lead-intake')
    const result = await createLeadAndEnterPipeline(tenantId, {
      phone, name, source: 'web-chat', notes: `Started web chat with phone ${phone}`,
    })
    return result.clientId
  } catch (leadErr) {
    console.error('[public/webchat] lead creation failed:', leadErr)
    await trackError(leadErr, { source: 'api/public/webchat:lead-creation', severity: 'high', tenantId }).catch(() => {})
    return null
  }
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
  const blockedIps = (tenant as { blocked_ips?: string[] | null }).blocked_ips
  if (ip !== 'unknown' && blockedIps?.includes(ip)) {
    return NextResponse.json({ error: 'Unable to start chat' }, { status: 403 })
  }

  const rl = await rateLimitDb(`public_webchat:${tenant.id}:${ip}`, 30, 10 * 60 * 1000)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many messages. Try again later.' }, { status: 429 })

  const body = await req.json().catch(() => null) as {
    threadId?: string
    body?: string
    imageDataUrl?: string
    visitorName?: string
    visitorPhone?: string
  } | null
  const text = body?.body?.trim() || ''
  if (!text && !body?.imageDataUrl) {
    return NextResponse.json({ error: 'Message or image required' }, { status: 400 })
  }
  const visitorName = body?.visitorName?.trim().slice(0, 120) || null
  const visitorPhone = body?.visitorPhone?.trim().slice(0, 30) || null

  let threadId = body?.threadId || null
  let contactId: string | null = null
  let isNewThread = false

  if (threadId) {
    const thread = await loadThread(tenant.id, threadId)
    if (!thread) return NextResponse.json({ error: 'Unknown chat session' }, { status: 404 })
    contactId = thread.contact_id

    if (contactId) {
      const { data: contactBlock } = await supabaseAdmin
        .from('comhub_contacts')
        .select('blocked_at')
        .eq('id', contactId)
        .single()
      if (contactBlock?.blocked_at) {
        return NextResponse.json({ error: 'Unable to send message' }, { status: 403 })
      }
    }
    // Backfill only — a visitor who started chatting before giving their name
    // (or on an older thread predating identity capture) still gets it
    // attached the moment they do give it, without clobbering anything
    // already on file (fetch-then-patch-nulls-only, since a plain .update()
    // can't express "only if currently null" per-column). A newly-given
    // phone also resolves/creates the real client record, same as a
    // brand-new thread does below.
    if (contactId && (visitorName || visitorPhone)) {
      const { data: existing } = await supabaseAdmin
        .from('comhub_contacts')
        .select('name, phone, client_id')
        .eq('id', contactId)
        .single()
      const patch: Record<string, string> = {}
      if (visitorName && !existing?.name) patch.name = visitorName
      if (visitorPhone && !existing?.phone) patch.phone = visitorPhone
      if (visitorPhone && !existing?.client_id) {
        const clientId = await resolveClientIdForPhone(tenant.id, visitorPhone, visitorName)
        if (clientId) patch.client_id = clientId
      }
      if (Object.keys(patch).length > 0) {
        await supabaseAdmin.from('comhub_contacts').update(patch).eq('id', contactId)
      }
    }
  } else {
    const clientId = visitorPhone ? await resolveClientIdForPhone(tenant.id, visitorPhone, visitorName) : null
    const geo = ip !== 'unknown' ? await lookupIpGeo(ip) : { city: null, region: null }
    const { data: contact, error: contactErr } = await supabaseAdmin
      .from('comhub_contacts')
      .insert({
        tenant_id: tenant.id,
        name: visitorName,
        phone: visitorPhone,
        client_id: clientId,
        ip_address: ip !== 'unknown' ? ip : null,
        geo_city: geo.city,
        geo_region: geo.region,
      })
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
    // Date/time up front (not just relative "just now" framing) so an admin
    // scanning Telegram/email later can tell exactly when the chat came in —
    // prepended rather than appended so it survives the 140-char truncation
    // below on a long first message.
    const sentAtLabel = new Date().toLocaleString('en-US', {
      timeZone: (tenant as { timezone?: string | null }).timezone || 'America/New_York',
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
    await notify({
      tenantId: tenant.id,
      type: 'new_lead',
      title: visitorName ? `New Web Chat — ${visitorName}` : 'New Web Chatbot Conversation',
      message: `[${sentAtLabel}] ${text ? text.slice(0, 140) : 'Visitor started a chat and shared a photo'}`,
    }).catch(() => {})
  }

  return NextResponse.json({ threadId, contactId, messageId: msg.id, imageUrl })
}
