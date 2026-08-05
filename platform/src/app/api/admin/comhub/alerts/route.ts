import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'

// GET /api/admin/comhub/alerts?since=<ISO>
//   Polled by the top-drop live-alert popup. Returns inbound SMS/email/web/
//   voice ComHub messages that landed after `since`, newest first, capped
//   small — this drives an interrupt-style UI, not an inbox.
export async function GET(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  const since = req.nextUrl.searchParams.get('since')
  if (!since) return NextResponse.json({ error: 'since is required' }, { status: 400 })

  const serverTime = new Date().toISOString()

  const { data: messages, error } = await supabaseAdmin
    .from('comhub_messages')
    .select('id, thread_id, contact_id, channel, body, subject, sent_at')
    .eq('tenant_id', tenantId)
    .eq('direction', 'in')
    .in('channel', ['sms', 'email', 'web', 'voice'])
    .gt('sent_at', since)
    .order('sent_at', { ascending: false })
    .limit(10)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!messages || messages.length === 0) {
    return NextResponse.json({ alerts: [], server_time: serverTime })
  }

  const threadIds = Array.from(new Set(messages.map(m => m.thread_id)))
  const contactIds = Array.from(new Set(messages.map(m => m.contact_id).filter(Boolean) as string[]))

  const [{ data: threads }, { data: contacts }] = await Promise.all([
    supabaseAdmin
      .from('comhub_threads')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .in('id', threadIds),
    contactIds.length > 0
      ? supabaseAdmin
          .from('comhub_contacts')
          .select('id, name, phone, email')
          .eq('tenant_id', tenantId)
          .in('id', contactIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null; phone: string | null; email: string | null }[] }),
  ])

  const statusByThread = Object.fromEntries((threads || []).map(t => [t.id, t.status]))
  const contactById = Object.fromEntries((contacts || []).map(c => [c.id, c]))

  const alerts = messages
    // A thread the operator already closed out shouldn't interrupt them again
    // just because the contact texted "thanks" — closed threads stay silent.
    .filter(m => statusByThread[m.thread_id] !== 'closed')
    .map(m => {
      const contact = m.contact_id ? contactById[m.contact_id] : null
      return {
        message_id: m.id,
        thread_id: m.thread_id,
        channel: m.channel,
        body: m.body,
        subject: m.subject,
        sent_at: m.sent_at,
        contact_name: contact?.name || contact?.phone || contact?.email || 'Unknown contact',
        contact_phone: contact?.phone || null,
        contact_email: contact?.email || null,
      }
    })

  return NextResponse.json({ alerts, server_time: serverTime })
}
