import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'

export async function GET() {
  try {
    const { tenantId, userId } = await getTenantForRequest()
    const db = tenantDb(tenantId)

    // Get all channels for tenant
    const { data: channelRows } = await db
      .from('connect_channels')
      .select('id')
    const channels = channelRows as unknown as Array<{ id: string }> | null

    if (!channels || channels.length === 0) {
      return NextResponse.json({ unread: 0 })
    }

    const channelIds = channels.map((c) => c.id)

    // Get read cursors for this user
    const { data: cursorRows } = await db
      .from('connect_read_cursors')
      .select('channel_id, last_read_at')
      .eq('reader_type', 'owner')
      .eq('reader_id', userId)
      .in('channel_id', channelIds)
    const cursors = cursorRows as unknown as Array<{ channel_id: string; last_read_at: string | null }> | null

    const cursorMap = new Map((cursors || []).map((c) => [c.channel_id, c.last_read_at]))

    // Count unread messages per channel
    let totalUnread = 0
    for (const chId of channelIds) {
      const lastRead = cursorMap.get(chId)
      let query = db
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
