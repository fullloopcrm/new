import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { askSelena } from '@/lib/selena/agent'
import { insertConversationMessage } from '@/lib/sms-messages'

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

  if (sessionId) {
    // sessionId is caller-supplied. askSelena() below resolves its tenant
    // context (loadContext, RBAC-gated tools, brand rewrite) purely from the
    // sms_conversations row for this id — NOT from the caller's authenticated
    // tenant. Without this check, a manager+ from tenant A could pass another
    // tenant's admin-dashboard conversation id and get Selena to read/act on
    // tenant B's data and return it directly in this response.
    const { data: owned } = await supabaseAdmin
      .from('sms_conversations')
      .select('id')
      .eq('id', sessionId)
      .eq('tenant_id', tenant.tenantId)
      .maybeSingle()
    if (!owned) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
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

  await insertConversationMessage(
    { conversation_id: sessionId, direction: 'inbound', message },
    { expectedTenantId: tenant.tenantId },
  )

  const result = await askSelena('web', message, sessionId, ownerPhone)
  const reply = result.text || '(no reply)'

  await insertConversationMessage(
    { conversation_id: sessionId, direction: 'outbound', message: reply },
    { expectedTenantId: tenant.tenantId },
  )

  return NextResponse.json({ reply, sessionId, toolsCalled: result.toolsCalled })
}
