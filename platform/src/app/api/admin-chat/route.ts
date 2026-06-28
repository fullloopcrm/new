import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { protectAdminAPI } from '@/lib/nycmaid/auth'
import { getCurrentTenant } from '@/lib/tenant'
import { askYinez } from '@/lib/yinez/agent'

export const maxDuration = 60

// Use the first OWNER_PHONES entry so isOwner() in agent.ts triggers admin context.
function getOwnerPhone(): string {
  const list = (process.env.OWNER_PHONES || '').split(',').map((s) => s.trim()).filter(Boolean)
  return list[0] || '+12122029220'
}

export async function POST(req: NextRequest) {
  const authError = await protectAdminAPI()
  if (authError) return authError

  // Tenant isolation: scope the admin-chat conversation to the caller's tenant
  // (resolved from signed header) so one tenant's owner-chat can't read or
  // collide with another's.
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'No tenant context' }, { status: 403 })

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
      .eq('tenant_id', tenant.id)
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
          tenant_id: tenant.id,
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
    .from('sms_conversation_messages')
    .insert({ conversation_id: sessionId, direction: 'inbound', message })
    .then(() => {}, () => {})

  const result = await askYinez('web', message, sessionId, ownerPhone)
  const reply = result.text || '(no reply)'

  await supabaseAdmin
    .from('sms_conversation_messages')
    .insert({ conversation_id: sessionId, direction: 'outbound', message: reply })
    .then(() => {}, () => {})

  return NextResponse.json({ reply, sessionId, toolsCalled: result.toolsCalled })
}
