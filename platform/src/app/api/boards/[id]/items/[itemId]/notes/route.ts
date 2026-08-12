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
import { sendEmail, tenantSender } from '@/lib/email'
import { genericNotificationEmail } from '@/lib/email-templates'
import type { BoardAttachment } from '@/components/boards/types'
import type { TenantContext } from '@/lib/tenant-query'

type Params = { params: Promise<{ id: string; itemId: string }> }

const MAX_ATTACHMENTS = 10

// Tiptap's Mention extension serializes each @mention as
// <span data-type="mention" data-id="...">@Label</span> -- data-type/data-id
// are explicitly allowlisted in sanitize-html.ts's ALLOWED_ATTR, so they
// survive sanitization intact. Extract the tenant_members ids so mentioned
// people can be notified, same as a board assignment.
function extractMentionedIds(sanitizedHtml: string): string[] {
  const ids = new Set<string>()
  const re = /data-type="mention"[^>]*\sdata-id="([^"]+)"|data-id="([^"]+)"[^>]*\sdata-type="mention"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(sanitizedHtml)) !== null) {
    const id = m[1] || m[2]
    if (id) ids.add(id)
  }
  return [...ids]
}

async function notifyMentioned(opts: {
  db: ReturnType<typeof tenantDb>
  tenant: TenantContext['tenant']
  tenantId: string
  boardId: string
  itemId: string
  itemName: string
  authorId: string
  authorName: string
  mentionedIds: string[]
}): Promise<void> {
  const { db, tenant, boardId, itemId, itemName, authorId, authorName, mentionedIds } = opts
  const targets = mentionedIds.filter((id) => id !== authorId)
  if (targets.length === 0) return

  const { data: members } = await db.from('tenant_members').select('id, name, email').in('id', targets)
  if (!members || members.length === 0) return

  const { data: board } = await db.from('boards').select('name').eq('id', boardId).single()
  const boardName = board?.name || 'Task Board'
  const dashboardHost = tenant.domain || `${tenant.slug}.fullloopcrm.com`
  const itemUrl = `https://${dashboardHost}/dashboard/boards/${boardId}`

  await Promise.all(
    members.filter((mem) => mem.email).map((mem) =>
      sendEmail({
        to: mem.email as string,
        subject: `${authorName} mentioned you: ${itemName}`,
        html: genericNotificationEmail({
          title: `You were mentioned on ${boardName}`,
          message: `${authorName} mentioned you in "${itemName}".\n\nOpen it: ${itemUrl}`,
          tenantName: tenant.name,
          primaryColor: tenant.primary_color,
        }),
        from: tenantSender(tenant),
        resendApiKey: tenant.resend_api_key,
      }).catch((err) => console.error('board mention email failed:', err)),
    ),
  )

  await db.from('notifications').insert({
    type: 'board_task_mentioned',
    title: 'Task Board Mention',
    message: `${authorName} mentioned ${members.map((mem) => mem.name).join(', ')} in "${itemName}"`,
    channel: 'in_app',
    recipient_type: 'admin',
    status: 'sent',
  }).then(() => {}, (err) => console.error('board mention in-app notification failed:', err))
}

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

    const mentionedIds = extractMentionedIds(sanitizedBody)
    if (mentionedIds.length > 0) {
      notifyMentioned({
        db, tenant, tenantId, boardId, itemId, itemName: item.name, authorId: userId, authorName, mentionedIds,
      }).catch((err) => console.error('notifyMentioned failed:', err))
    }

    return NextResponse.json({ note }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/boards/[id]/items/[itemId]/notes', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
