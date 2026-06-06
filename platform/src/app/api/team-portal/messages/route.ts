import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET  /api/team-portal/messages?team_member_id=<uuid>  — team member's comhub thread with admin.
// POST /api/team-portal/messages { team_member_id, body } — team member messages admin (lands in Comhub).
// Auth: trust-based via team_member_id, consistent with the rest of /api/team-portal/*.
// Ported from standalone nycmaid (/api/team/messages); cleaner_id -> team_member_id, tenant-scoped.

async function resolveThread(teamMemberId: string): Promise<{ contactId: string | null; threadId: string | null; tenantId: string | null }> {
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('id, name, phone, email, tenant_id')
    .eq('id', teamMemberId)
    .single()
  if (!member) return { contactId: null, threadId: null, tenantId: null }

  const { data: existing } = await supabaseAdmin
    .from('comhub_contacts')
    .select('id')
    .eq('team_member_id', teamMemberId)
    .limit(1)
  let contactId: string | null = (existing && existing[0]?.id) || null

  if (!contactId && member.phone) {
    const { data } = await supabaseAdmin.rpc('comhub_get_or_create_contact_by_phone', { p_phone: member.phone, p_name: member.name })
    contactId = (data as string) || null
    if (contactId) {
      await supabaseAdmin.from('comhub_contacts').update({ team_member_id: teamMemberId }).eq('id', contactId)
    }
  }
  if (!contactId) return { contactId: null, threadId: null, tenantId: member.tenant_id || null }

  const { data: tId } = await supabaseAdmin.rpc('comhub_get_or_create_thread', { p_contact_id: contactId, p_channel: 'web' })
  return { contactId, threadId: (tId as string) || null, tenantId: member.tenant_id || null }
}

export async function GET(req: NextRequest) {
  const teamMemberId = new URL(req.url).searchParams.get('team_member_id') || new URL(req.url).searchParams.get('cleaner_id')
  if (!teamMemberId) return NextResponse.json({ error: 'Missing team_member_id' }, { status: 400 })

  const { threadId } = await resolveThread(teamMemberId)
  if (!threadId) return NextResponse.json({ messages: [] })

  const { data, error } = await supabaseAdmin
    .from('comhub_messages')
    .select('id, direction, author, body, sent_at, channel')
    .eq('thread_id', threadId)
    .order('sent_at', { ascending: true })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('comhub_threads').update({ unread_count: 0 }).eq('id', threadId)
  return NextResponse.json({ thread_id: threadId, messages: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { team_member_id?: string; cleaner_id?: string; body?: string } | null
  const teamMemberId = body?.team_member_id || body?.cleaner_id
  if (!teamMemberId || !body?.body?.trim()) {
    return NextResponse.json({ error: 'team_member_id and body required' }, { status: 400 })
  }

  const { contactId, threadId } = await resolveThread(teamMemberId)
  if (!contactId || !threadId) return NextResponse.json({ error: 'team member not found' }, { status: 404 })

  const { data: msg, error } = await supabaseAdmin
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

  await supabaseAdmin
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
