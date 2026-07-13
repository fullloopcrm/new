import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'

// GET  /api/team-portal/messages — team member's comhub thread with admin.
// POST /api/team-portal/messages { body } — team member messages admin (lands in Comhub).
// Auth: bearer token (verifyToken), same as every other /api/team-portal/* route.
// team_member_id/tenant_id come from the verified token, never from the request —
// this previously trusted a caller-supplied team_member_id with no auth at all,
// letting anyone read or send another tenant's team member's office thread.
// Ported from standalone nycmaid (/api/team/messages); cleaner_id -> team_member_id, tenant-scoped.

// tenantDb's select() widens the columns literal to `string`, so postgrest-js
// can't statically parse the result shape here — cast at this boundary (see
// admin/comhub/threads/[id]/route.ts for precedent).
type MemberRow = { id: string; name: string | null; phone: string | null; email: string | null }
type ContactRow = { id: string }

async function resolveThread(tenantId: string, teamMemberId: string): Promise<{ contactId: string | null; threadId: string | null }> {
  const db = tenantDb(tenantId)

  const { data: member } = (await db
    .from('team_members')
    .select('id, name, phone, email')
    .eq('id', teamMemberId)
    .single()) as unknown as { data: MemberRow | null }
  if (!member) return { contactId: null, threadId: null }

  const { data: existing } = (await db
    .from('comhub_contacts')
    .select('id')
    .eq('team_member_id', teamMemberId)
    .limit(1)) as unknown as { data: ContactRow[] | null }
  let contactId: string | null = (existing && existing[0]?.id) || null

  if (!contactId && member.phone) {
    const { data } = await supabaseAdmin.rpc('comhub_get_or_create_contact_by_phone', {
      p_tenant_id: tenantId, p_phone: member.phone, p_name: member.name,
    })
    contactId = (data as string) || null
    if (contactId) {
      await db.from('comhub_contacts').update({ team_member_id: teamMemberId }).eq('id', contactId)
    }
  }
  if (!contactId) return { contactId: null, threadId: null }

  const { data: tId } = await supabaseAdmin.rpc('comhub_get_or_create_thread', {
    p_tenant_id: tenantId, p_contact_id: contactId, p_channel: 'web',
  })
  return { contactId, threadId: (tId as string) || null }
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { threadId } = await resolveThread(auth.tid, auth.id)
  if (!threadId) return NextResponse.json({ messages: [] })
  const db = tenantDb(auth.tid)

  const { data, error } = await db
    .from('comhub_messages')
    .select('id, direction, author, body, sent_at, channel')
    .eq('thread_id', threadId)
    .order('sent_at', { ascending: true })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('comhub_threads').update({ unread_count: 0 }).eq('id', threadId)
  return NextResponse.json({ thread_id: threadId, messages: data || [] })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await req.json().catch(() => null) as { body?: string } | null
  if (!body?.body?.trim()) return NextResponse.json({ error: 'body required' }, { status: 400 })

  const { contactId, threadId } = await resolveThread(auth.tid, auth.id)
  if (!contactId || !threadId) return NextResponse.json({ error: 'team member not found' }, { status: 404 })
  const db = tenantDb(auth.tid)

  const { data: msg, error } = await db
    .from('comhub_messages')
    .insert({
      thread_id: threadId,
      contact_id: contactId,
      channel: 'web',
      direction: 'in',
      author: 'cleaner',
      body: body.body.trim(),
      sent_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db
    .from('comhub_threads')
    .update({
      last_message_at: msg.sent_at,
      last_message_preview: body.body.trim().slice(0, 140),
      unread_count: 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', threadId)

  return NextResponse.json({ ok: true, message_id: msg.id, thread_id: threadId })
}
