// Shared helper: log a voice-agent event to a caller's ComHub voice thread.
// Tenant-scoped port of nycmaid's src/lib/voice/comhub-log.ts (commit
// fb5d382f) — the RPCs it calls (comhub_get_or_create_contact_by_phone,
// comhub_get_or_create_thread) already take p_tenant_id in this codebase
// (see migrations/2026_05_19_comhub.sql), so this just threads tenantId
// through instead of assuming a single tenant.
//
// Used by both the MCP tool events (booking/escalation/note/save_caller/
// send_booking_link) and the Telnyx call-lifecycle webhook (call started/
// ended/recording/transcript). Best-effort: ComHub logging must never break
// a live call or a tool response.
import { supabaseAdmin } from '@/lib/supabase'

function digits(raw: string): string {
  return String(raw || '').replace(/\D/g, '')
}

export async function logComhubVoiceMessage(
  tenantId: string,
  phone: string,
  body: string,
  opts: { direction?: 'in' | 'out' | 'system'; author?: string } = {},
): Promise<void> {
  try {
    const clean = digits(phone)
    if (clean.length < 10) return
    const { data: cId } = await supabaseAdmin.rpc('comhub_get_or_create_contact_by_phone', {
      p_tenant_id: tenantId,
      p_phone: clean,
    })
    if (!cId) return
    const contactId = cId as string
    const { data: tId } = await supabaseAdmin.rpc('comhub_get_or_create_thread', {
      p_tenant_id: tenantId,
      p_contact_id: contactId,
      p_channel: 'voice',
    })
    if (!tId) return
    const threadId = tId as string
    const now = new Date().toISOString()
    await supabaseAdmin.from('comhub_messages').insert({
      tenant_id: tenantId,
      thread_id: threadId,
      contact_id: contactId,
      channel: 'voice',
      direction: opts.direction ?? 'system',
      author: opts.author ?? 'yinez',
      body,
      sent_at: now,
    })
    await supabaseAdmin
      .from('comhub_threads')
      .update({ last_message_at: now, last_message_preview: body.slice(0, 120), updated_at: now })
      .eq('id', threadId)
  } catch {
    // swallow — comhub logging is never allowed to break a call or tool response
  }
}
