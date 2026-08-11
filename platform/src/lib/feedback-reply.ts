import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantTimezone } from '@/lib/tenant-time'

// Matches an inbound SMS to a pending admin->client feedback reply thread
// (started from /dashboard/clients/feedback's "Reply" button) and appends it
// as a note on the client_feedback row. Global, tenant-scoped — every tenant
// gets this once the reply button ships. Returns a Response when handled, or
// null to fall through to the next handler (rating engine already ran first;
// this only fires for a client with a genuinely pending reply thread).
const REPLY_WINDOW_DAYS = 30

export async function handleFeedbackReply(
  { tenantId, from, text }: { tenantId: string; from: string; text: string },
): Promise<Response | null> {
  const rawText = (text || '').trim()
  if (!rawText) return null

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('phone', from)
    .maybeSingle()
  if (!client) return null

  const windowStart = new Date(Date.now() - REPLY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: pending } = await supabaseAdmin
    .from('client_feedback')
    .select('id, notes')
    .eq('tenant_id', tenantId)
    .eq('client_id', client.id)
    .not('reply_requested_at', 'is', null)
    .gte('reply_requested_at', windowStart)
    .order('reply_requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!pending) return null

  const { data: tenantRow } = await supabaseAdmin.from('tenants').select('timezone').eq('id', tenantId).maybeSingle()
  const timestamp = new Date().toLocaleString('en-US', { timeZone: getTenantTimezone(tenantRow), month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const noteLine = `[${client.name || 'Client'} reply, ${timestamp}] ${rawText}`
  const updatedNotes = pending.notes ? `${pending.notes}\n${noteLine}` : noteLine

  await supabaseAdmin
    .from('client_feedback')
    .update({ notes: updatedNotes })
    .eq('id', pending.id)

  await supabaseAdmin.from('notifications').insert({
    tenant_id: tenantId,
    type: 'feedback_reply',
    title: `Feedback reply: ${client.name || 'Client'}`,
    message: rawText.slice(0, 500),
    metadata: { client_id: client.id, feedback_id: pending.id, phone: from },
  }).then(() => {}, () => {})

  return NextResponse.json({ received: true, action: 'feedback_reply_captured' })
}
