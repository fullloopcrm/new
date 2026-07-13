import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'

// GET /api/admin/comhub/threads/[id]
//   Returns thread + contact + ordered messages.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const db = tenantDb(tenantId)
  const { id } = await ctx.params

  const { data: thread, error: tErr } = await db
    .from('comhub_threads')
    .select(`
      id, contact_id, channel, kind, name, slug, description,
      subject, status, disposition, assignee_id, bot_paused_until,
      last_message_at, last_message_preview, unread_count, snoozed_until, created_at,
      comhub_contacts (
        id, name, phone, email, client_id, team_member_id
      )
    `)
    .eq('id', id)
    .single()
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 404 })

  const { data: messages, error: mErr } = await db
    .from('comhub_messages')
    .select('id, direction, author, author_id, body, media_urls, subject, from_address, to_address, sent_at, read_at, channel, metadata, flagged_for_review, flagged_reason')
    .eq('thread_id', id)
    .order('sent_at', { ascending: true })
    .limit(500)
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })

  // Resolve author names from tenant_members (Clerk-backed).
  // tenantDb's select() widens the columns literal to `string`, so postgrest-js
  // can't statically parse the result shape here — cast at this boundary.
  const messageRows = (messages ?? []) as unknown as Array<{ author_id: string | null }>
  const authorIds = Array.from(new Set(messageRows.map((m) => m.author_id).filter(Boolean) as string[]))
  let authors: Record<string, { name: string | null; email: string | null }> = {}
  if (authorIds.length > 0) {
    const { data: au } = await db
      .from('tenant_members')
      .select('id, name, email')
      .in('id', authorIds)
    const memberRows = (au ?? []) as unknown as Array<{ id: string; name: string | null; email: string | null }>
    authors = Object.fromEntries(memberRows.map((u) => [u.id, { name: u.name, email: u.email }]))
  }

  return NextResponse.json({ thread, messages: messages || [], authors })
}

// PATCH /api/admin/comhub/threads/[id]
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const db = tenantDb(tenantId)
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({})) as {
    status?: 'open' | 'snoozed' | 'closed'
    snoozed_until?: string | null
    assignee_id?: string | null
    mark_read?: boolean
    takeover_minutes?: number
    handback?: boolean
    disposition?: 'waiting_customer' | 'waiting_admin' | 'closed_booked' | 'closed_lost' | 'closed_spam' | null
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status) patch.status = body.status
  if (body.snoozed_until !== undefined) patch.snoozed_until = body.snoozed_until
  if (body.assignee_id !== undefined) patch.assignee_id = body.assignee_id
  if (body.mark_read) patch.unread_count = 0
  if (body.disposition !== undefined) patch.disposition = body.disposition
  if (typeof body.takeover_minutes === 'number' && body.takeover_minutes > 0) {
    patch.bot_paused_until = new Date(Date.now() + body.takeover_minutes * 60 * 1000).toISOString()
  }
  if (body.handback) {
    patch.bot_paused_until = null
  }

  const { data, error } = await db
    .from('comhub_threads')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.mark_read) {
    await db
      .from('comhub_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('thread_id', id)
      .is('read_at', null)
      .eq('direction', 'in')
  }

  return NextResponse.json({ thread: data })
}
