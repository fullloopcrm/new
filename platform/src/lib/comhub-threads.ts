/**
 * Shared ComHub thread-list query, extracted from
 * /api/admin/comhub/threads (GET) so the mobile-scoped route
 * (/api/mobile/comhub/threads, tenant bearer-token auth instead of the
 * platform requireAdmin() gate) doesn't duplicate the contact
 * auto-link/resolve and search-filter logic — same reasoning as
 * resolveTenantVoiceConfig for the voice/token endpoint.
 */
import { tenantDb } from './tenant-db'
import { resolveContactLinkage, isPlaceholderName } from './comhub-contact-resolve'

export interface ListThreadsParams {
  kind: string
  status: string
  channel: string
  filter: string
  q: string
  limit: number
  offset: number
}

interface ContactRow {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  client_id: string | null
  team_member_id: string | null
  tag: string | null
}

interface RawThread {
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

export async function listComhubThreads(tenantId: string, params: ListThreadsParams) {
  const db = tenantDb(tenantId)
  const { kind, status, channel, filter, q, limit, offset } = params

  const join = kind === 'channel' ? 'comhub_contacts' : 'comhub_contacts!left'
  let query = db
    .from('comhub_threads')
    .select(`
      id, contact_id, channel, kind, name, slug, description,
      subject, status, disposition, assignee_id, bot_paused_until,
      last_message_at, last_message_preview, unread_count, snoozed_until, created_at,
      ${join} (
        id, name, phone, email, client_id, team_member_id, tag
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
  if (error) return { threads: null, error: error.message }

  let threads = ((data || []) as unknown as RawThread[]).map(t => ({
    ...t,
    comhub_contacts: Array.isArray(t.comhub_contacts) ? (t.comhub_contacts[0] || null) : t.comhub_contacts,
  }))

  const unresolved = threads
    .map(t => t.comhub_contacts)
    .filter((c): c is ContactRow => !!c && (!c.client_id || !c.team_member_id || isPlaceholderName(c.name, c.phone)))
  if (unresolved.length > 0) {
    const resolved = await Promise.all(
      unresolved.map(c => resolveContactLinkage(db, tenantId, { ...c, email: c.email })),
    )
    const byId = new Map(resolved.map(r => [r.id, r]))
    threads = threads.map(t => {
      if (!t.comhub_contacts) return t
      const r = byId.get(t.comhub_contacts.id)
      if (!r) return t
      return { ...t, comhub_contacts: { ...t.comhub_contacts, name: r.name, client_id: r.client_id, team_member_id: r.team_member_id } }
    })
  }

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
    const { data: lastMsgs } = await db
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

  return { threads, error: null }
}
