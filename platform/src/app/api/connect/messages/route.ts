import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { isCrossSiteRequest } from '@/lib/csrf-guard'
import { capString } from '@/lib/validate'

// connect_messages.body had no type check or length cap -- same class as the
// social/post message/caption gap. 5000 matches that free-text precedent.
const MAX_BODY_LENGTH = 5000

export async function GET(request: NextRequest) {
  try {
    const { tenantId, userId } = await getTenantForRequest()
    const channelId = request.nextUrl.searchParams.get('channel_id')

    if (!channelId) return NextResponse.json({ error: 'channel_id required' }, { status: 400 })

    // Verify channel belongs to tenant
    const { data: channel } = await supabaseAdmin
      .from('connect_channels')
      .select('id')
      .eq('id', channelId)
      .eq('tenant_id', tenantId)
      .single()

    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

    const { data: messages, error } = await supabaseAdmin
      .from('connect_messages')
      .select('id, sender_type, sender_id, sender_name, body, created_at')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update read cursor. Skipped on a forged cross-site GET (SameSite=Lax
    // still sends cookies on top-level navigation) — see csrf-guard.ts.
    if (!isCrossSiteRequest(request.headers)) {
      await supabaseAdmin
        .from('connect_read_cursors')
        .upsert(
          {
            channel_id: channelId,
            tenant_id: tenantId,
            reader_type: 'owner',
            reader_id: userId,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: 'channel_id,reader_type,reader_id' }
        )
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, tenant, userId } = await getTenantForRequest()
    const requestBody = await request.json()
    const channel_id = requestBody?.channel_id
    const body = capString(requestBody?.body, MAX_BODY_LENGTH)

    if (!channel_id || !body) {
      return NextResponse.json({ error: 'channel_id and body required' }, { status: 400 })
    }

    // Verify channel belongs to tenant
    const { data: channel } = await supabaseAdmin
      .from('connect_channels')
      .select('id')
      .eq('id', channel_id)
      .eq('tenant_id', tenantId)
      .single()

    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

    const { data, error } = await supabaseAdmin
      .from('connect_messages')
      .insert({
        channel_id,
        tenant_id: tenantId,
        sender_type: 'owner',
        sender_id: userId,
        sender_name: tenant.owner_name || tenant.name || 'Owner',
        body,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update read cursor
    await supabaseAdmin
      .from('connect_read_cursors')
      .upsert(
        {
          channel_id,
          tenant_id: tenantId,
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
