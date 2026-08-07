import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requireComhubAccess } from '@/lib/comhub-access'

const VALID_TAGS = ['client', 'team', 'lead', 'potential_lead', 'spam', 'vendor', 'other'] as const
type ContactTag = typeof VALID_TAGS[number]

// POST /api/admin/comhub/contacts/bulk
//   { action: 'delete', contact_ids: string[] }
//   { action: 'tag', contact_ids: string[], tag: ContactTag | null }
//
// Checkbox-driven bulk actions from the ComHub thread list. 'delete' removes
// the contact from ComHub only — its threads + messages (the inbox/CRM
// conversation) — never the underlying `clients`/`team_members` row, which
// has its own dedicated safe-purge flow elsewhere. This is scoped to what
// ComHub owns.
export async function POST(req: NextRequest) {
  const access = await requireComhubAccess()
  if (access instanceof NextResponse) return access
  const tenantId = access.tenantId
  const db = tenantDb(tenantId)

  const body = await req.json().catch(() => null) as {
    action?: 'delete' | 'tag'
    contact_ids?: string[]
    tag?: ContactTag | null
  } | null

  if (!body?.action || !Array.isArray(body.contact_ids) || body.contact_ids.length === 0) {
    return NextResponse.json({ error: 'action and contact_ids are required' }, { status: 400 })
  }
  const contactIds = body.contact_ids

  const { data: owned } = await db
    .from('comhub_contacts')
    .select('id')
    .in('id', contactIds)
    .eq('tenant_id', tenantId)
  const ownedIds = (owned || []).map((r) => r.id as string)
  if (ownedIds.length === 0) return NextResponse.json({ error: 'no matching contacts' }, { status: 404 })

  if (body.action === 'tag') {
    if (body.tag !== null && body.tag !== undefined && !VALID_TAGS.includes(body.tag as ContactTag)) {
      return NextResponse.json({ error: `tag must be one of ${VALID_TAGS.join(', ')}, or null` }, { status: 400 })
    }
    const { error } = await db
      .from('comhub_contacts')
      .update({ tag: body.tag ?? null, updated_at: new Date().toISOString() })
      .in('id', ownedIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, updated: ownedIds.length })
  }

  if (body.action === 'delete') {
    const { data: threads } = await db
      .from('comhub_threads')
      .select('id')
      .in('contact_id', ownedIds)
      .eq('tenant_id', tenantId)
    const threadIds = (threads || []).map((t) => t.id as string)

    if (threadIds.length > 0) {
      const { error: msgErr } = await db.from('comhub_messages').delete().in('thread_id', threadIds)
      if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })
      const { error: threadErr } = await db.from('comhub_threads').delete().in('id', threadIds)
      if (threadErr) return NextResponse.json({ error: threadErr.message }, { status: 500 })
    }

    const { error: contactErr } = await db.from('comhub_contacts').delete().in('id', ownedIds)
    if (contactErr) return NextResponse.json({ error: contactErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, deleted: ownedIds.length })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
