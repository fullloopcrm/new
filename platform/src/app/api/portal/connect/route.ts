import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../auth/token'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const db = tenantDb(auth.tid)

  try {
    // Find or create client channel
    let { data: channel } = (await db
      .from('connect_channels')
      .select('id')
      .eq('type', 'client')
      .eq('client_id', auth.id)
      .single()) as { data: { id: string } | null }

    if (!channel) {
      // Get client name for channel
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('name')
        .eq('id', auth.id)
        .single()

      const { data: created } = (await db
        .from('connect_channels')
        .insert({
          type: 'client',
          name: client?.name || 'Client',
          client_id: auth.id,
        })
        .select('id')
        .single()) as { data: { id: string } | null }
      channel = created
    }

    if (!channel) return NextResponse.json({ messages: [] })

    const { data: messages } = await db
      .from('connect_messages')
      .select('id, sender_type, sender_id, sender_name, body, created_at')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: true })
      .limit(200)

    // Update read cursor
    await db
      .from('connect_read_cursors')
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

  const db = tenantDb(auth.tid)

  try {
    // Get client name
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('name')
      .eq('id', auth.id)
      .single()

    let targetChannelId = channel_id

    // A caller-supplied channel_id must belong to THIS client's own channel —
    // otherwise a client could inject a message (stamped with their own
    // tenant_id via tenantDb) under a foreign channel_id, which then surfaces
    // in that channel's real owner's inbox (connect/messages GET reads
    // connect_messages by channel_id alone, with no tenant_id filter).
    if (targetChannelId) {
      const { data: owned } = (await db
        .from('connect_channels')
        .select('id')
        .eq('id', targetChannelId)
        .eq('client_id', auth.id)
        .single()) as { data: { id: string } | null }
      if (!owned) targetChannelId = null
    }

    if (!targetChannelId) {
      let { data: channel } = (await db
        .from('connect_channels')
        .select('id')
        .eq('type', 'client')
        .eq('client_id', auth.id)
        .single()) as { data: { id: string } | null }

      if (!channel) {
        const { data: created } = (await db
          .from('connect_channels')
          .insert({
            type: 'client',
            name: client?.name || 'Client',
            client_id: auth.id,
          })
          .select('id')
          .single()) as { data: { id: string } | null }
        channel = created
      }

      targetChannelId = channel?.id
    }

    if (!targetChannelId) return NextResponse.json({ error: 'No channel' }, { status: 400 })

    const { data, error } = await db
      .from('connect_messages')
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
    await db
      .from('connect_read_cursors')
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
