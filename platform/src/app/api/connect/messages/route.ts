import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { isCrossSiteRequest } from '@/lib/csrf-guard'
import { translateToEnEs } from '@/lib/connect-translate'

export async function GET(request: NextRequest) {
  try {
    const { tenantId, userId } = await getTenantForRequest()
    const db = tenantDb(tenantId)
    const channelId = request.nextUrl.searchParams.get('channel_id')

    if (!channelId) return NextResponse.json({ error: 'channel_id required' }, { status: 400 })

    // Verify channel belongs to tenant
    const { data: channel } = await db
      .from('connect_channels')
      .select('id')
      .eq('id', channelId)
      .single()

    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

    const { data: messages, error } = await db
      .from('connect_messages')
      .select('id, sender_type, sender_id, sender_name, body, body_en, created_at')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // display_body is the English version for a translated (type='team')
    // channel; falls back to the raw body for every other channel type.
    const displayMessages = (messages || []).map((m) => ({ ...m, display_body: m.body_en || m.body }))

    // Update read cursor. Skipped on a forged cross-site GET (SameSite=Lax
    // still sends cookies on top-level navigation) — see csrf-guard.ts.
    if (!isCrossSiteRequest(request.headers)) {
      await db
        .from('connect_read_cursors')
        .upsert(
          {
            channel_id: channelId,
            reader_type: 'owner',
            reader_id: userId,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: 'channel_id,reader_type,reader_id' }
        )
    }

    return NextResponse.json({ messages: displayMessages })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, tenant, userId } = await getTenantForRequest()
    const db = tenantDb(tenantId)
    const { channel_id, body } = await request.json()

    if (!channel_id || !body?.trim()) {
      return NextResponse.json({ error: 'channel_id and body required' }, { status: 400 })
    }

    // Verify channel belongs to tenant
    const { data: channel } = await db
      .from('connect_channels')
      .select('id, type')
      .eq('id', channel_id)
      .single()

    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

    // Only the private team<->admin channel is auto-translated -- client/
    // referrer/custom channels are unaffected.
    const translated = channel.type === 'team'
      ? await translateToEnEs(body.trim(), tenant.anthropic_api_key)
      : null

    const { data, error } = await db
      .from('connect_messages')
      .insert({
        channel_id,
        sender_type: 'owner',
        sender_id: userId,
        sender_name: tenant.owner_name || tenant.name || 'Owner',
        body: body.trim(),
        ...(translated ? { body_en: translated.en, body_es: translated.es } : {}),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update read cursor
    await db
      .from('connect_read_cursors')
      .upsert(
        {
          channel_id,
          reader_type: 'owner',
          reader_id: userId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'channel_id,reader_type,reader_id' }
      )

    return NextResponse.json({ message: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
