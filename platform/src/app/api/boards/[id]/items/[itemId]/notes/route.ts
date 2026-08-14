/**
 * Task Board — per-item notes thread (tenant-scoped). This is the
 * "communication" surface: click an item, see/add notes on it. Modeled on
 * the connect_messages sender-name convention in src/app/api/connect/messages/route.ts.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { sanitizeNoteHtml, htmlTextLength } from '@/lib/sanitize-html'
import { audit } from '@/lib/audit'
import { notify } from '@/lib/notify'
import { extractMentionedMemberIds } from '@/lib/boards'
import type { BoardAttachment } from '@/components/boards/types'

type Params = { params: Promise<{ id: string; itemId: string }> }

const MAX_ATTACHMENTS = 10

// Caller-supplied attachment metadata (the file itself already went through
// /api/uploads before this call) — never trust it further than "does this
// look like a real record we can safely render as a link/chip later."
function normalizeAttachments(raw: unknown): BoardAttachment[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null)
    .map((a) => ({
      name: typeof a.name === 'string' ? a.name.slice(0, 255) : 'file',
      url: typeof a.url === 'string' ? a.url : '',
      size: typeof a.size === 'number' ? a.size : 0,
      content_type: typeof a.content_type === 'string' ? a.content_type : '',
    }))
    .filter((a) => a.url.startsWith('http://') || a.url.startsWith('https://'))
    .slice(0, MAX_ATTACHMENTS)
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { itemId } = await params
    const db = tenantDb(tenantId)

    const { data: notes, error } = await db
      .from('board_item_notes')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return NextResponse.json({ notes: notes || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/boards/[id]/items/[itemId]/notes', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('boards.edit')
    if (_authError) return _authError
    const { tenantId, tenant, userId } = _authTenant
    const { id: boardId, itemId } = await params
    const body = await request.json().catch(() => ({}))
    const db = tenantDb(tenantId)

    // Sanitize before the emptiness check — an editor can legitimately submit
    // an attachment-only update with a body of "<p></p>", and a malicious
    // caller could pad an otherwise-empty body with stripped tags to slip
    // past a naive .trim() check.
    const sanitizedBody = sanitizeNoteHtml(typeof body.body === 'string' ? body.body : '')
    const attachments = normalizeAttachments(body.attachments)
    if (htmlTextLength(sanitizedBody) === 0 && attachments.length === 0) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 })
    }

    const { data: item } = await db.from('board_items').select('id, name').eq('board_id', boardId).eq('id', itemId).single()
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const authorName = tenant.owner_name || tenant.name || 'Team'
    const { data: note, error } = await db
      .from('board_item_notes')
      .insert({
        item_id: itemId,
        kind: 'note',
        author_type: 'team',
        author_id: userId,
        author_name: authorName,
        body: sanitizedBody,
        attachments,
      })
      .select('*')
      .single()
    if (error) throw error

    await audit({ tenantId, action: 'board_item.note_added', entityType: 'board_item', entityId: itemId, userId, details: { board_id: boardId, item_name: item.name } })

    // @mentions get a real, targeted email to that specific person — not just
    // a shared in-app bell row every dashboard user sees (see notify()'s
    // 'tenant_member' recipientType, added alongside this). A silent tag
    // nobody actually gets pinged for isn't a notification.
    const mentionedIds = extractMentionedMemberIds(sanitizedBody).filter((id) => id !== userId)
    if (mentionedIds.length > 0) {
      const { data: mentioned } = await db.from('tenant_members').select('id, name').in('id', mentionedIds)
      const boardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.fullloopcrm.com'}/dashboard/boards/${boardId}`
      await Promise.all(
        (mentioned || []).map((m) =>
          notify({
            tenantId,
            type: 'board_note_mention',
            title: `${authorName} mentioned you on "${item.name}"`,
            message: `${authorName} tagged you on the Task Board item "${item.name}":\n\n"${htmlTextLength(sanitizedBody) > 0 ? sanitizedBody.replace(/<[^>]+>/g, ' ').trim() : '(attachment)'}"\n\nOpen it here: ${boardUrl}`,
            channel: 'email',
            recipientType: 'tenant_member',
            recipientId: m.id,
          }).catch((err) => console.error('board mention email notify failed:', err)),
        ),
      )
    }

    return NextResponse.json({ note }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/boards/[id]/items/[itemId]/notes', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
