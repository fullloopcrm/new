import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'
import { notifyConnectDM } from '@/lib/connect-notify'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  try {
    // Find or create general channel
    let { data: channel } = await tenantDb(auth.tid)
      .from('connect_channels') // tenant-scope-ok: tenantDb() scopes the select; audit heuristic doesn't parse the wrapper
      .select('id')
      .eq('type', 'general')
      .single()

    if (!channel) {
      const { data: created } = await tenantDb(auth.tid)
        .from('connect_channels') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
        .insert({ type: 'general', name: 'General' })
        .select('id')
        .single()
      channel = created
    }

    if (!channel) return NextResponse.json({ messages: [] })

    const { data: messages } = await supabaseAdmin
      .from('connect_messages')
      .select('id, sender_type, sender_id, sender_name, body, attachments, created_at')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: true })
      .limit(200)

    // Update read cursor
    await tenantDb(auth.tid)
      .from('connect_read_cursors') // tenant-scope-ok: tenantDb() stamps tenant_id on upsert
      .upsert(
        {
          channel_id: channel.id,
          reader_type: 'team',
          reader_id: auth.id,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'channel_id,reader_type,reader_id' }
      )

    return NextResponse.json({ messages: messages || [], channel_id: channel.id })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { body, channel_id } = await request.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Body required' }, { status: 400 })

  try {
    // Get member name
    const { data: member } = await tenantDb(auth.tid)
      .from('team_members')
      .select('name')
      .eq('id', auth.id)
      .single()

    // Never trust a caller-supplied channel_id directly — verify it's this
    // tenant's general channel, or this specific team member's own DM channel,
    // before using it. Otherwise a forged id could inject a message into
    // another tenant's channel, another team member's private DM, or a
    // client's private channel within this tenant.
    let targetChannelId: string | undefined
    let targetChannelType: string | undefined
    if (channel_id) {
      const { data: candidate } = await supabaseAdmin
        .from('connect_channels')
        .select('id, type, team_member_id')
        .eq('id', channel_id)
        .eq('tenant_id', auth.tid)
        .single()
      // .or() isn't reliable across the fake test client — check the
      // general-vs-own-dm business rule in application code instead.
      const isOwnDm = candidate?.type === 'dm' && candidate.team_member_id === auth.id
      if (candidate && (candidate.type === 'general' || isOwnDm)) {
        targetChannelId = candidate.id
        targetChannelType = candidate.type
      }
    }

    // If no channel_id provided (or it didn't pass ownership), use general channel
    if (!targetChannelId) {
      let { data: channel } = await tenantDb(auth.tid)
        .from('connect_channels') // tenant-scope-ok: tenantDb() scopes the select; audit heuristic doesn't parse the wrapper
        .select('id')
        .eq('type', 'general')
        .single()

      if (!channel) {
        const { data: created } = await tenantDb(auth.tid)
          .from('connect_channels') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
          .insert({ type: 'general', name: 'General' })
          .select('id')
          .single()
        channel = created
      }

      targetChannelId = channel?.id
      targetChannelType = 'general'
    }

    if (!targetChannelId) return NextResponse.json({ error: 'No channel' }, { status: 400 })

    const { data, error } = await tenantDb(auth.tid)
      .from('connect_messages') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
      .insert({
        channel_id: targetChannelId,
        sender_type: 'team',
        sender_id: auth.id,
        sender_name: member?.name || 'Team Member',
        body: body.trim(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update read cursor
    await tenantDb(auth.tid)
      .from('connect_read_cursors') // tenant-scope-ok: tenantDb() stamps tenant_id on upsert
      .upsert(
        {
          channel_id: targetChannelId,
          reader_type: 'team',
          reader_id: auth.id,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'channel_id,reader_type,reader_id' }
      )

    if (targetChannelType === 'dm') {
      notifyConnectDM({
        tenantId: auth.tid,
        direction: 'to_owner',
        teamMemberId: auth.id,
        senderName: member?.name || 'Team Member',
        body: body.trim(),
      }).catch(err => console.error('[team-portal/connect] notify failed:', err))
    }

    return NextResponse.json({ message: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
