import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { askSelena } from '@/lib/selena/agent'
import { rateLimitDb } from '@/lib/rate-limit-db'

export const maxDuration = 60

const MAX_MESSAGE_LENGTH = 4000

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
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Message too long — max ${MAX_MESSAGE_LENGTH} characters` }, { status: 400 })
  }

  // Every message here drives a real Anthropic call (askSelena) and this
  // route is gated on settings.view — held by manager, not just admin/owner
  // — with no other cost control. Same rate-limit convention as
  // admin/translate / ai/chat / ai/assistant / /api/chat / /api/yinez.
  const rl = await rateLimitDb(`admin-chat:${tenant.tenantId}`, 30, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many messages. Try again shortly.' }, { status: 429 })
  }

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

  // tenant_id stamped explicitly — an unstamped insert falls back to
  // sms_conversation_messages' column DEFAULT ('nycmaid', the rollout safety
  // net from 2026_05_09_tenant_id_core.sql), mis-tagging every other
  // tenant's message as nycmaid's and hiding it from that tenant's own
  // tenant-scoped GET ?convoId read. Same gap already fixed on the selena
  // reset-insert sibling; tracked as P2 "write-side siblings" in
  // deploy-prep/idor-remediation-status.md.
  await supabaseAdmin
    .from('sms_conversation_messages')
    .insert({ conversation_id: sessionId, direction: 'inbound', message, tenant_id: tenant.tenantId })
    .then(() => {}, () => {})

  const result = await askSelena('web', message, sessionId, ownerPhone)
  const reply = result.text || '(no reply)'

  // tenant_id stamped — same reasoning as the inbound insert above.
  await supabaseAdmin
    .from('sms_conversation_messages')
    .insert({ conversation_id: sessionId, direction: 'outbound', message: reply, tenant_id: tenant.tenantId })
    .then(() => {}, () => {})

  return NextResponse.json({ reply, sessionId, toolsCalled: result.toolsCalled })
}
