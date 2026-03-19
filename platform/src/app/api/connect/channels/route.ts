import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const { data: channels, error } = await supabaseAdmin
      .from('connect_channels')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('type', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Get last message for each channel
    const channelIds = (channels || []).map((c) => c.id)
    let lastMessages: Record<string, { body: string; sender_name: string; created_at: string }> = {}

    if (channelIds.length > 0) {
      const { data: msgs } = await supabaseAdmin
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
    const { name, type, client_id } = await request.json()

    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const channelType = type || 'custom'

    // Auto-create general channel if it doesn't exist
    if (channelType === 'general') {
      const { data: existing } = await supabaseAdmin
        .from('connect_channels')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('type', 'general')
        .single()

      if (existing) return NextResponse.json({ channel: existing })
    }

    const { data, error } = await supabaseAdmin
      .from('connect_channels')
      .insert({
        tenant_id: tenantId,
        name,
        type: channelType,
        client_id: client_id || null,
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
