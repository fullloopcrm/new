import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { tenantId, userId } = await getTenantForRequest()

    // Get all channels for tenant
    const { data: channels } = await supabaseAdmin
      .from('connect_channels')
      .select('id')
      .eq('tenant_id', tenantId)

    if (!channels || channels.length === 0) {
      return NextResponse.json({ unread: 0 })
    }

    const channelIds = channels.map((c) => c.id)

    // Get read cursors for this user
    const { data: cursors } = await supabaseAdmin
      .from('connect_read_cursors')
      .select('channel_id, last_read_at')
      .eq('reader_type', 'owner')
      .eq('reader_id', userId)
      .in('channel_id', channelIds)

    const cursorMap = new Map((cursors || []).map((c) => [c.channel_id, c.last_read_at]))

    // Count unread messages per channel
    let totalUnread = 0
    for (const chId of channelIds) {
      const lastRead = cursorMap.get(chId)
      let query = supabaseAdmin
        .from('connect_messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', chId)

      if (lastRead) {
        query = query.gt('created_at', lastRead)
      }

      const { count } = await query
      if (count && count > 0) totalUnread++
    }

    return NextResponse.json({ unread: totalUnread })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
