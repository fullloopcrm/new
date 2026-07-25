import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../../auth/token'

// Loop Connect, field-team side: the channel list behind the switcher.
// Every worker always has their own private 'team' thread with admin, plus
// any admin-created group/broadcast 'custom' channels they were added to
// (mass messaging — see connect_channel_members).
export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  try {
    let { data: teamChannel } = await tenantDb(auth.tid)
      .from('connect_channels') // tenant-scope-ok: tenantDb() scopes the select
      .select('id, name')
      .eq('type', 'team')
      .eq('team_member_id', auth.id)
      .single()

    if (!teamChannel) {
      const { data: member } = await tenantDb(auth.tid).from('team_members').select('name').eq('id', auth.id).single()
      const { data: created } = await tenantDb(auth.tid)
        .from('connect_channels') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
        .insert({ type: 'team', name: member?.name || 'Team Member', team_member_id: auth.id })
        .select('id, name')
        .single()
      teamChannel = created
    }

    const { data: memberships } = await tenantDb(auth.tid)
      .from('connect_channel_members') // tenant-scope-ok: tenantDb() scopes the select
      .select('channel_id')
      .eq('team_member_id', auth.id)

    const groupChannelIds = (memberships || []).map((m) => m.channel_id)
    let groupChannels: { id: string; name: string }[] = []
    if (groupChannelIds.length > 0) {
      const { data } = await tenantDb(auth.tid)
        .from('connect_channels') // tenant-scope-ok: tenantDb() scopes the select
        .select('id, name')
        .in('id', groupChannelIds)
      groupChannels = data || []
    }

    const channelIds = [teamChannel?.id, ...groupChannels.map((c) => c.id)].filter(Boolean) as string[]
    let lastMessages: Record<string, { body: string; created_at: string }> = {}
    if (channelIds.length > 0) {
      const { data: msgs } = await supabaseAdmin
        .from('connect_messages')
        .select('channel_id, body, body_es, created_at')
        .in('channel_id', channelIds)
        .order('created_at', { ascending: false })
      for (const m of msgs || []) {
        if (!lastMessages[m.channel_id]) lastMessages[m.channel_id] = { body: m.body_es || m.body, created_at: m.created_at }
      }
    }

    const channels = [
      { id: teamChannel?.id, name: 'Message Admin', type: 'team', last_message: teamChannel ? lastMessages[teamChannel.id] || null : null },
      ...groupChannels.map((c) => ({ id: c.id, name: c.name, type: 'custom', last_message: lastMessages[c.id] || null })),
    ].filter((c) => c.id)

    return NextResponse.json({ channels })
  } catch {
    return NextResponse.json({ channels: [] })
  }
}
