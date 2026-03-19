import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPortalToken } from '../auth/route'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  try {
    // Find or create client channel
    let { data: channel } = await supabaseAdmin
      .from('connect_channels')
      .select('id')
      .eq('tenant_id', auth.tid)
      .eq('type', 'client')
      .eq('client_id', auth.id)
      .single()

    if (!channel) {
      // Get client name for channel
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('name')
        .eq('id', auth.id)
        .single()

      const { data: created } = await supabaseAdmin
        .from('connect_channels')
        .insert({
          tenant_id: auth.tid,
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
    await supabaseAdmin
      .from('connect_read_cursors')
      .upsert(
        {
          channel_id: channel.id,
          tenant_id: auth.tid,
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
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('name')
      .eq('id', auth.id)
      .single()

    let targetChannelId = channel_id

    if (!targetChannelId) {
      let { data: channel } = await supabaseAdmin
        .from('connect_channels')
        .select('id')
        .eq('tenant_id', auth.tid)
        .eq('type', 'client')
        .eq('client_id', auth.id)
        .single()

      if (!channel) {
        const { data: created } = await supabaseAdmin
          .from('connect_channels')
          .insert({
            tenant_id: auth.tid,
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

    const { data, error } = await supabaseAdmin
      .from('connect_messages')
      .insert({
        channel_id: targetChannelId,
        tenant_id: auth.tid,
        sender_type: 'client',
        sender_id: auth.id,
        sender_name: client?.name || 'Client',
        body: body.trim(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update read cursor
    await supabaseAdmin
      .from('connect_read_cursors')
      .upsert(
        {
          channel_id: targetChannelId,
          tenant_id: auth.tid,
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
