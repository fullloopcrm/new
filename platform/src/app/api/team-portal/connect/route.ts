import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'
import { translateToEnEs } from '@/lib/connect-translate'

// Loop Connect, field-team side. Each team member gets their OWN private
// channel with admin (type='team', scoped to team_member_id) -- this is a
// personal chat replacing texting, not a team-wide room. Messages are
// auto-translated both ways (see connect-translate.ts): this route always
// returns display_body = body_es, since the team member's device shows Spanish.
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  try {
    let { data: channel } = await tenantDb(auth.tid)
      .from('connect_channels') // tenant-scope-ok: tenantDb() scopes the select; audit heuristic doesn't parse the wrapper
      .select('id')
      .eq('type', 'team')
      .eq('team_member_id', auth.id)
      .single()

    if (!channel) {
      const { data: member } = await tenantDb(auth.tid)
        .from('team_members')
        .select('name')
        .eq('id', auth.id)
        .single()
      const { data: created } = await tenantDb(auth.tid)
        .from('connect_channels') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
        .insert({ type: 'team', name: member?.name || 'Team Member', team_member_id: auth.id })
        .select('id')
        .single()
      channel = created
    }

    if (!channel) return NextResponse.json({ messages: [] })

    const { data: messages } = await supabaseAdmin
      .from('connect_messages')
      .select('id, sender_type, sender_id, sender_name, body, body_es, created_at')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: true })
      .limit(200)

    const displayMessages = (messages || []).map((m) => ({ ...m, display_body: m.body_es || m.body }))

    await tenantDb(auth.tid)
      .from('connect_read_cursors') // tenant-scope-ok: tenantDb() stamps tenant_id on upsert
      .upsert(
        { channel_id: channel.id, reader_type: 'team', reader_id: auth.id, last_read_at: new Date().toISOString() },
        { onConflict: 'channel_id,reader_type,reader_id' }
      )

    return NextResponse.json({ messages: displayMessages, channel_id: channel.id })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { body } = await request.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Body required' }, { status: 400 })

  try {
    const { data: member } = await tenantDb(auth.tid)
      .from('team_members')
      .select('name')
      .eq('id', auth.id)
      .single()

    let { data: channel } = await tenantDb(auth.tid)
      .from('connect_channels') // tenant-scope-ok: tenantDb() scopes the select; audit heuristic doesn't parse the wrapper
      .select('id')
      .eq('type', 'team')
      .eq('team_member_id', auth.id)
      .single()

    if (!channel) {
      const { data: created } = await tenantDb(auth.tid)
        .from('connect_channels') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
        .insert({ type: 'team', name: member?.name || 'Team Member', team_member_id: auth.id })
        .select('id')
        .single()
      channel = created
    }

    if (!channel) return NextResponse.json({ error: 'No channel' }, { status: 400 })

    const { data: tenant } = await supabaseAdmin.from('tenants').select('anthropic_api_key').eq('id', auth.tid).single()
    const { en, es } = await translateToEnEs(body.trim(), tenant?.anthropic_api_key)

    const { data, error } = await tenantDb(auth.tid)
      .from('connect_messages') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
      .insert({
        channel_id: channel.id,
        sender_type: 'team',
        sender_id: auth.id,
        sender_name: member?.name || 'Team Member',
        body: body.trim(),
        body_en: en,
        body_es: es,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await tenantDb(auth.tid)
      .from('connect_read_cursors') // tenant-scope-ok: tenantDb() stamps tenant_id on upsert
      .upsert(
        { channel_id: channel.id, reader_type: 'team', reader_id: auth.id, last_read_at: new Date().toISOString() },
        { onConflict: 'channel_id,reader_type,reader_id' }
      )

    return NextResponse.json({ message: { ...data, display_body: data.body_es || data.body } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
