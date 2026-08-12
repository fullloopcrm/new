import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

// GET /api/mobile/comhub/threads/[id] — mobile-scoped equivalent of
// /api/admin/comhub/threads/[id]. Small and self-contained enough that
// duplicating it (rather than extracting a shared helper) is the
// reasonable call, unlike the list route's contact-resolution/search logic.
export const OPTIONS = corsPreflight

export const GET = withMobileCors(async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let tenantId: string
  try {
    const authCtx = await getTenantForRequest()
    tenantId = authCtx.tenantId
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401
    return NextResponse.json({ error: 'Unauthorized' }, { status })
  }
  const { id } = await ctx.params

  const { data: thread, error: tErr } = await supabaseAdmin
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
    .eq('tenant_id', tenantId)
    .single()
  if (tErr) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

  const { data: messages, error: mErr } = await supabaseAdmin
    .from('comhub_messages')
    .select('id, direction, author, author_id, body, media_urls, subject, from_address, to_address, sent_at, read_at, channel')
    .eq('thread_id', id)
    .eq('tenant_id', tenantId)
    .order('sent_at', { ascending: true })
    .limit(500)
  if (mErr) return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })

  return NextResponse.json({ thread, messages: messages || [] })
})

// PATCH /api/mobile/comhub/threads/[id] — mobile-scoped equivalent of
// /api/admin/comhub/threads/[id]'s PATCH, but deliberately narrower: only
// `{ mark_read: true }` is supported here. The admin route's full surface
// (status/snooze/assignee/disposition/bot-takeover) is dashboard thread
// management, not something the mobile app's Com Hub Home feed needs —
// this exists specifically to give the mobile app a real read-receipt
// action (opening a thread should actually clear its unread state server
// -side, not just look read locally) rather than mirroring everything.
export const PATCH = withMobileCors(async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let tenantId: string
  try {
    const authCtx = await getTenantForRequest()
    tenantId = authCtx.tenantId
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401
    return NextResponse.json({ error: 'Unauthorized' }, { status })
  }
  const { id } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as { mark_read?: boolean }

  if (!body.mark_read) {
    return NextResponse.json({ error: 'mark_read is the only supported field' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('comhub_threads')
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: 'Failed to update thread' }, { status: 500 })

  await supabaseAdmin
    .from('comhub_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('thread_id', id)
    .eq('tenant_id', tenantId)
    .is('read_at', null)
    .eq('direction', 'in')

  return NextResponse.json({ thread: data })
})
