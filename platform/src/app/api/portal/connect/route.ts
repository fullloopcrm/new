import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../auth/token'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  try {
    // Find or create client channel
    let { data: channel } = await tenantDb(auth.tid)
      .from('connect_channels') // tenant-scope-ok: tenantDb() scopes the select; audit heuristic doesn't parse the wrapper
      .select('id')
      .eq('type', 'client')
      .eq('client_id', auth.id)
      .single()

    if (!channel) {
      // Get client name for channel
      const { data: client } = await tenantDb(auth.tid)
        .from('clients')
        .select('name')
        .eq('id', auth.id)
        .single()

      const { data: created } = await tenantDb(auth.tid)
        .from('connect_channels') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
        .insert({
          type: 'client',
          name: client?.name || 'Client',
          client_id: auth.id,
        })
        .select('id')
        .single()
      channel = created
    }

    if (!channel) return NextResponse.json({ messages: [] })

    const { data: messages } = await supabaseAdmin
      .from('connect_messages')
      .select('id, sender_type, sender_id, sender_name, body, created_at')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: true })
      .limit(200)

    // Update read cursor
    await tenantDb(auth.tid)
      .from('connect_read_cursors') // tenant-scope-ok: tenantDb() stamps tenant_id on upsert
      .upsert(
        {
          channel_id: channel.id,
          reader_type: 'client',
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

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { body, channel_id } = await request.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Body required' }, { status: 400 })

  try {
    // Get client name
    const { data: client } = await tenantDb(auth.tid)
      .from('clients')
      .select('name')
      .eq('id', auth.id)
      .single()

    let targetChannelId = channel_id

    // channel_id is caller-supplied — verify it's actually this client's own
    // channel before using it, same ownership check the no-channel_id
    // fallback branch below performs implicitly by resolving its own id.
    // Without this, any portal-authenticated client who learns another
    // party's channel UUID (log exposure, future leak, etc.) could insert
    // messages into it (IDOR, flagged in supabase-admin-gate-baseline-audit.md).
    if (targetChannelId) {
      const { data: owned } = await tenantDb(auth.tid)
        .from('connect_channels') // tenant-scope-ok: tenantDb() scopes the select
        .select('id')
        .eq('id', targetChannelId)
        .eq('type', 'client')
        .eq('client_id', auth.id)
        .single()
      if (!owned) return NextResponse.json({ error: 'Invalid channel' }, { status: 403 })
    }

    if (!targetChannelId) {
      let { data: channel } = await tenantDb(auth.tid)
        .from('connect_channels') // tenant-scope-ok: tenantDb() scopes the select; audit heuristic doesn't parse the wrapper
        .select('id')
        .eq('type', 'client')
        .eq('client_id', auth.id)
        .single()

      if (!channel) {
        const { data: created } = await tenantDb(auth.tid)
          .from('connect_channels') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
          .insert({
            type: 'client',
            name: client?.name || 'Client',
            client_id: auth.id,
          })
          .select('id')
          .single()
        channel = created
      }

      targetChannelId = channel?.id
    }

    if (!targetChannelId) return NextResponse.json({ error: 'No channel' }, { status: 400 })

    const { data, error } = await tenantDb(auth.tid)
      .from('connect_messages') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
      .insert({
        channel_id: targetChannelId,
        sender_type: 'client',
        sender_id: auth.id,
        sender_name: client?.name || 'Client',
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
          reader_type: 'client',
          reader_id: auth.id,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'channel_id,reader_type,reader_id' }
      )

    return NextResponse.json({ message: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
