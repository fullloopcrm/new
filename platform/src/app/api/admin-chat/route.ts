import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { askSelena } from '@/lib/selena/agent'

export const maxDuration = 60

// Use the first OWNER_PHONES entry so isOwner() in agent.ts triggers admin context.
function getOwnerPhone(): string {
  const list = (process.env.OWNER_PHONES || '').split(',').map((s) => s.trim()).filter(Boolean)
  return list[0] || '+12122029220'
}

export async function POST(req: NextRequest) {
  // FL auth (replaces legacy admin_session). Authenticates the caller + scopes
  // the owner-chat conversation to their tenant.
  const { tenant, error: authErr } = await requirePermission('settings.view')
  if (authErr) return authErr

  let body: { message?: string; sessionId?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }
  const message = (body.message || '').trim()
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

  const ownerPhone = getOwnerPhone()
  let sessionId: string = body.sessionId || ''

  // A client-supplied sessionId must belong to THIS tenant's conversation.
  // Without this check, any authenticated caller could pass another
  // tenant's sms_conversations.id: resolveTenantForConversation() in
  // lib/selena/agent.ts derives the AI agent's tenant context purely from
  // the conversation row's tenant_id (not the caller's session), so an
  // unverified sessionId lets a Tenant-A staffer read/write Tenant-B's
  // admin-chat thread and run Selena tool calls against Tenant B's data
  // using Tenant B's own Anthropic key.
  if (sessionId) {
    const { data: owned } = await supabaseAdmin
      .from('sms_conversations')
      .select('id')
      .eq('id', sessionId)
      .eq('tenant_id', tenant.tenantId)
      .maybeSingle()
    if (!owned) sessionId = ''
  }

  if (!sessionId) {
    // The unique partial index `idx_sms_conv_active_phone` only allows ONE active
    // (completed_at IS NULL AND expired = false) conversation per phone. Without a
    // lookup-first, every fresh admin-chat session would hit constraint violation
    // because the owner's phone always has at least one active SMS or admin convo.
    // Use the canonical +1XXXXXXXXXX form to match what telnyx + telegram store.
    const normalizedPhone = ownerPhone.startsWith('+') ? ownerPhone : `+1${ownerPhone.replace(/\D/g, '').slice(-10)}`

    const { data: existing } = await supabaseAdmin
      .from('sms_conversations')
      .select('id')
      .eq('tenant_id', tenant.tenantId)
      .eq('phone', normalizedPhone)
      .eq('state', 'admin-dashboard')
      .is('completed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (existing && existing.length > 0) {
      sessionId = existing[0].id
    } else {
      const { data: convo, error } = await supabaseAdmin
        .from('sms_conversations')
        .insert({
          tenant_id: tenant.tenantId,
          phone: normalizedPhone,
          state: 'admin-dashboard',
          booking_checklist: { channel: 'admin-dashboard', phone: ownerPhone },
        })
        .select('id')
        .single()
      if (error || !convo) {
        return NextResponse.json({ error: error?.message || 'failed to create conversation' }, { status: 500 })
      }
      sessionId = convo.id
    }
  }

  await supabaseAdmin
    .from('sms_conversation_messages')  // tenant-scope-ok: row-scoped by conversation_id (conversation is tenant-owned)
    .insert({ conversation_id: sessionId, direction: 'inbound', message })
    .then(() => {}, () => {})

  const result = await askSelena('web', message, sessionId, ownerPhone)
  const reply = result.text || '(no reply)'

  await supabaseAdmin
    .from('sms_conversation_messages')  // tenant-scope-ok: row-scoped by conversation_id (conversation is tenant-owned)
    .insert({ conversation_id: sessionId, direction: 'outbound', message: reply })
    .then(() => {}, () => {})

  return NextResponse.json({ reply, sessionId, toolsCalled: result.toolsCalled })
}
