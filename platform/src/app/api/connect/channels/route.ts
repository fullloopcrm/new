import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const db = tenantDb(tenantId)

    const { data: channels, error } = await db
      .from('connect_channels')
      .select('*')
      .order('type', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Get last message for each channel
    const channelIds = (channels || []).map((c) => c.id)
    let lastMessages: Record<string, { body: string; sender_name: string; created_at: string }> = {}

    if (channelIds.length > 0) {
      const { data: msgs } = await db
        .from('connect_messages')
        .select('channel_id, body, sender_name, created_at')
        .in('channel_id', channelIds)
        .order('created_at', { ascending: false })

      // Take the first (latest) message per channel
      for (const m of msgs || []) {
        if (!lastMessages[m.channel_id]) {
          lastMessages[m.channel_id] = { body: m.body, sender_name: m.sender_name, created_at: m.created_at }
        }
      }
    }

    const enriched = (channels || []).map((ch) => ({
      ...ch,
      last_message: lastMessages[ch.id] || null,
    }))

    return NextResponse.json({ channels: enriched })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const db = tenantDb(tenantId)
    const { name, type, client_id, team_member_id } = await request.json()

    const channelType = type || 'custom'

    // DM channel name is derived from the team member, not caller-supplied.
    if (channelType !== 'dm' && !name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    // Auto-create general channel if it doesn't exist
    if (channelType === 'general') {
      const { data: existing } = await db
        .from('connect_channels')
        .select('id')
        .eq('type', 'general')
        .single()

      if (existing) return NextResponse.json({ channel: existing })
    }

    // client_id is a caller-supplied FK with no cross-tenant check of its own —
    // same class as the deals/projects/bookings client_id-injection fixes this
    // session. No current read joins connect_channels.client_id back to
    // clients, but verify ownership anyway so a foreign id can never be
    // planted here to leak PII if such a join is added later.
    if (client_id) {
      const { data: ownedClient } = await db
        .from('clients')
        .select('id')
        .eq('id', client_id)
        .maybeSingle()
      if (!ownedClient) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
    }

    let dmName = name
    if (channelType === 'dm') {
      if (!team_member_id) return NextResponse.json({ error: 'team_member_id required' }, { status: 400 })

      const { data: existing } = await db
        .from('connect_channels')
        .select('*')
        .eq('type', 'dm')
        .eq('team_member_id', team_member_id)
        .maybeSingle()
      if (existing) return NextResponse.json({ channel: existing })

      // Same ownership-verification reasoning as client_id above.
      const { data: ownedMember } = await db
        .from('team_members')
        .select('id, name')
        .eq('id', team_member_id)
        .maybeSingle()
      if (!ownedMember) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      dmName = ownedMember.name || 'Team member'
    }

    const { data, error } = await db
      .from('connect_channels')
      .insert({
        name: dmName,
        type: channelType,
        client_id: client_id || null,
        team_member_id: channelType === 'dm' ? team_member_id : null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ channel: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
