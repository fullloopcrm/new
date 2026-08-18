/**
 * Shared ComHub thread-list query, extracted from
 * /api/admin/comhub/threads (GET) so the mobile-scoped route
 * (/api/mobile/comhub/threads, tenant bearer-token auth instead of the
 * platform requireAdmin() gate) doesn't duplicate the contact
 * auto-link/resolve and search-filter logic.
 */
import { tenantDb } from '@/lib/tenant-db'
import { resolveContactLinkage, isPlaceholderName } from '@/lib/comhub-contact-resolve'

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

interface ThreadWithDirection extends Omit<RawThread, 'comhub_contacts'> {
  comhub_contacts: ContactRow | null
  last_message_direction?: 'in' | 'out'
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
    .is('archived_at', null)

  if (kind !== 'all') query = query.eq('kind', kind)
  if (status !== 'all') query = query.eq('status', status)
  if (channel !== 'all') query = query.eq('channel', channel)
  if (filter === 'unread') query = query.gt('unread_count', 0)

  // The `q` search below runs in JS against the joined contact fields,
  // which isn't expressible as a single DB-level predicate. Paginating
  // with `offset`/`limit` before that filter would silently drop any
  // match outside the most-recent page. So: page normally when not
  // searching, but pull a much larger candidate set when `q` is set,
  // then paginate the filtered results below instead.
  const SEARCH_CANDIDATE_CAP = 1000
  query = q ? query.limit(SEARCH_CANDIDATE_CAP) : query.range(offset, offset + limit - 1)

  const { data, error } = await query
  if (error) return { threads: null, error: error.message }

  let threads: ThreadWithDirection[] = ((data || []) as unknown as RawThread[]).map(t => ({
    ...t,
    comhub_contacts: Array.isArray(t.comhub_contacts) ? (t.comhub_contacts[0] || null) : t.comhub_contacts,
  }))

  // Auto-link + name-backfill any contact on this page that isn't fully
  // resolved yet — so a brand-new applicant/team-member/client shows up
  // correctly connected without an admin ever having to open their panel.
  const unresolved = threads
    .map(t => t.comhub_contacts)
    .filter((c): c is ContactRow => !!c && ((!c.client_id && !c.team_member_id) || isPlaceholderName(c.name, c.phone)))
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
    // Pagination is applied post-filter for a search, since the candidate
    // set above is a broad pull rather than the requested page.
    threads = threads.slice(offset, offset + limit)
  }

  // Direction of each thread's most recent message. `comhub_threads` has no
  // such column of its own, so this is a second query keyed off the page's
  // thread ids — computed for every request (not just filter==='unresponded')
  // because the mobile Com Hub Home feed's "Tasks" quick-nav card (chats
  // awaiting a reply, see lib/comhub-feed.ts on the mobile app side) needs
  // it on every thread, not just when that one admin-dashboard filter is
  // active. Reused below for the unresponded filter too.
  if (threads.length > 0) {
    const ids = threads.map(t => t.id)
    const { data: lastMsgs } = await db
      .from('comhub_messages')
      .select('thread_id, direction, sent_at')
      .in('thread_id', ids)
      .order('sent_at', { ascending: false })
    const lastByThread: Record<string, 'in' | 'out'> = {}
    for (const m of lastMsgs || []) {
      if (!lastByThread[m.thread_id]) lastByThread[m.thread_id] = m.direction as 'in' | 'out'
    }
    threads = threads.map(t => ({ ...t, last_message_direction: lastByThread[t.id] }))
  }

  if (filter === 'unresponded') {
    threads = threads.filter(t => t.last_message_direction === 'in')
  }

  return { threads, error: null }
}
