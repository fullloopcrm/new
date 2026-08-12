import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../auth/token'
import { translateToEnEs } from '@/lib/connect-translate'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = corsPreflight

export const GET = withMobileCors(async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const db = tenantDb(auth.tid)

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

    const { data: messages } = await db
      .from('connect_messages')
      .select('id, sender_type, sender_id, sender_name, body, body_en, created_at')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: true })
      .limit(200)

    const displayMessages = (messages || []).map((m) => ({ ...m, display_body: m.body_en || m.body }))

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

    return NextResponse.json({ messages: displayMessages, channel_id: channel.id })
  } catch {
    return NextResponse.json({ messages: [] })
  }
})

export const POST = withMobileCors(async function POST(request: NextRequest) {
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

    // Never trust a caller-supplied channel_id directly — verify it's this
    // client's own channel before using it, otherwise a forged id could inject
    // a message into another client's (or another tenant's) channel.
    let targetChannelId: string | undefined
    if (channel_id) {
      const { data: ownedChannel } = await supabaseAdmin
        .from('connect_channels')
        .select('id')
        .eq('id', channel_id)
        .eq('tenant_id', auth.tid)
        .eq('type', 'client')
        .eq('client_id', auth.id)
        .single()
      if (ownedChannel) targetChannelId = ownedChannel.id
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

    const { data: tenant } = await supabaseAdmin.from('tenants').select('anthropic_api_key').eq('id', auth.tid).single()
    const { en, es } = await translateToEnEs(body.trim(), tenant?.anthropic_api_key)

    const { data, error } = await tenantDb(auth.tid)
      .from('connect_messages') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
      .insert({
        channel_id: targetChannelId,
        sender_type: 'client',
        sender_id: auth.id,
        sender_name: client?.name || 'Client',
        body: body.trim(),
        body_en: en,
        body_es: es,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to send' }, { status: 500 })

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
})
