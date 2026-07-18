import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { askSelena } from '@/lib/selena/agent'
import { capString } from '@/lib/validate'

export const maxDuration = 60

const ADMIN_YINEZ_CONTACT_PHONE = '+0000000000'
const ADMIN_YINEZ_NAME = 'Yinez (admin)'
// comhub_messages.body had no type check or length cap here -- same class as
// admin/comhub/send's body gap. Worse: (payload?.body || '').trim() threw an
// uncaught TypeError on any truthy non-string body (object/number lack
// .trim()) instead of a clean 400, and an uncapped body was forwarded
// straight into the Selena AI call. 5000 matches that sibling's cap.
const MAX_BODY_LENGTH = 5000

// POST /api/admin/comhub/yinez/send
//   { body: string }
// Admin chats with Yinez inside Comhub. Persists both the admin's prompt
// and Yinez's reply in tenant-scoped comhub_messages.
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  const payload = await req.json().catch(() => null) as { body?: string } | null
  const text = capString(payload?.body, MAX_BODY_LENGTH)
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
  const result = await askSelena('telegram', text, conversationId, ownerPhone)
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
