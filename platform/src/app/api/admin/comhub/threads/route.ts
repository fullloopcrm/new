import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'

// GET /api/admin/comhub/threads
//   ?kind=contact|channel|all (default contact)
//   &status=open|snoozed|closed|all (default open)
//   &channel=sms|email|voice|all (default all)
//   &filter=all|unread|unresponded (default all)
//   &q=<search>
//   &limit=50&offset=0
export async function GET(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  const { searchParams } = new URL(req.url)
  const kind = searchParams.get('kind') || 'contact'
  const status = searchParams.get('status') || 'open'
  const channel = searchParams.get('channel') || 'all'
  const filter = searchParams.get('filter') || 'all'
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200)
  const offset = parseInt(searchParams.get('offset') || '0', 10) || 0

  const join = kind === 'channel' ? 'comhub_contacts' : 'comhub_contacts!left'
  let query = supabaseAdmin
    .from('comhub_threads')
    .select(`
      id, contact_id, channel, kind, name, slug, description,
      subject, status, disposition, assignee_id, bot_paused_until,
      last_message_at, last_message_preview, unread_count, snoozed_until, created_at,
      ${join} (
        id, name, phone, email, client_id, team_member_id
      )
    `)
    .eq('tenant_id', tenantId)
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1)
    .is('archived_at', null)

  if (kind !== 'all') query = query.eq('kind', kind)
  if (status !== 'all') query = query.eq('status', status)
  if (channel !== 'all') query = query.eq('channel', channel)
  if (filter === 'unread') query = query.gt('unread_count', 0)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type ContactRow = {
    id: string
    name: string | null
    phone: string | null
    email: string | null
    client_id: string | null
    team_member_id: string | null
  }
  type RawThread = {
    id: string
    contact_id: string | null
    channel: string
    kind: string
    name: string | null
    slug: string | null
    description: string | null
    subject: string | null
    status: string
    assignee_id: string | null
    last_message_at: string
    last_message_preview: string | null
    unread_count: number
    snoozed_until: string | null
    created_at: string
    comhub_contacts: ContactRow | ContactRow[] | null
  }

  let threads = ((data || []) as unknown as RawThread[]).map(t => ({
    ...t,
    comhub_contacts: Array.isArray(t.comhub_contacts) ? (t.comhub_contacts[0] || null) : t.comhub_contacts,
  }))

  if (q) {
    const ql = q.toLowerCase()
    threads = threads.filter(t => {
      if (t.kind === 'channel') {
        return (t.name || '').toLowerCase().includes(ql)
            || (t.slug || '').toLowerCase().includes(ql)
            || (t.last_message_preview || '').toLowerCase().includes(ql)
      }
      const c = t.comhub_contacts
      return (c?.name || '').toLowerCase().includes(ql)
          || (c?.phone || '').toLowerCase().includes(ql)
          || (c?.email || '').toLowerCase().includes(ql)
          || (t.last_message_preview || '').toLowerCase().includes(ql)
    })
  }

  if (filter === 'unresponded' && threads.length > 0) {
    const ids = threads.map(t => t.id)
    const { data: lastMsgs } = await supabaseAdmin
      .from('comhub_messages')
      .select('thread_id, direction, sent_at')
      .in('thread_id', ids)
      .order('sent_at', { ascending: false })
    const lastByThread: Record<string, string> = {}
    for (const m of lastMsgs || []) {
      if (!lastByThread[m.thread_id]) lastByThread[m.thread_id] = m.direction
    }
    threads = threads.filter(t => lastByThread[t.id] === 'in')
  }

  return NextResponse.json({ threads })
}
