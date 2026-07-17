import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { askSelena } from '@/lib/selena/agent'

export const maxDuration = 60

const ADMIN_YINEZ_CONTACT_PHONE = '+0000000000'
const ADMIN_YINEZ_NAME = 'Yinez (admin)'

// POST /api/admin/comhub/yinez/send
//   { body: string }
// Admin chats with Yinez inside Comhub. Persists both the admin's prompt
// and Yinez's reply in tenant-scoped comhub_messages.
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  const payload = await req.json().catch(() => null) as { body?: string } | null
  const text = (payload?.body || '').trim()
  if (!text) return NextResponse.json({ error: 'body required' }, { status: 400 })

  const { data: contactId, error: cErr } = await supabaseAdmin
    .rpc('comhub_get_or_create_contact_by_phone', {
      p_tenant_id: tenantId,
      p_phone: ADMIN_YINEZ_CONTACT_PHONE,
      p_name: ADMIN_YINEZ_NAME,
    })
  if (cErr || !contactId) return NextResponse.json({ error: cErr?.message || 'contact create failed' }, { status: 500 })

  const { data: threadId, error: tErr } = await supabaseAdmin
    .rpc('comhub_get_or_create_thread', { p_tenant_id: tenantId, p_contact_id: contactId, p_channel: 'admin' })
  if (tErr || !threadId) return NextResponse.json({ error: tErr?.message || 'thread create failed' }, { status: 500 })

  await supabaseAdmin.from('comhub_messages').insert({
    tenant_id: tenantId,
    thread_id: threadId,
    contact_id: contactId,
    channel: 'admin',
    direction: 'out',
    author: 'admin',
    body: text,
    sent_at: new Date().toISOString(),
  })

  const conversationId = `comhub-admin-${threadId}`
  const ownerPhone = (process.env.ADMIN_FORWARD_PHONE || '').trim() || undefined
  // 'web' — this is Comhub's own web-based admin chat UI, not the real
  // Telegram bot (webhooks/telegram/route.ts). Passing 'telegram' made
  // agent.ts's channelNote falsely tell the model "you are ALWAYS talking
  // to Jeff, the owner" (a Telegram-only persona/tone override) for every
  // tenant's comhub admin — wrong identity claim in the system prompt, and
  // wrong channel attribution in Selena usage metrics (byChannel.telegram
  // instead of byChannel.web). Matches the sibling admin-chat/route.ts,
  // which already uses 'web' for the same kind of admin-realm AI chat.
  const result = await askSelena('web', text, conversationId, ownerPhone)
  const reply = result.text || `[yinez returned empty — tools called: ${result.toolsCalled.join(', ') || 'none'}]`

  await supabaseAdmin.from('comhub_messages').insert({
    tenant_id: tenantId,
    thread_id: threadId,
    contact_id: contactId,
    channel: 'admin',
    direction: 'in',
    author: 'yinez',
    body: reply,
    sent_at: new Date().toISOString(),
  })

  await supabaseAdmin
    .from('comhub_threads')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: reply.slice(0, 140),
      updated_at: new Date().toISOString(),
    })
    .eq('id', threadId)
    .eq('tenant_id', tenantId)

  return NextResponse.json({ ok: true, reply, tools_called: result.toolsCalled, thread_id: threadId })
}
