import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { tenantId, userId } = await getTenantForRequest()

    const [
      { count: clientCount },
      { count: bookingCount },
      { count: leadCount },
      { count: notificationCount },
    ] = await Promise.all([
      supabaseAdmin
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['scheduled', 'confirmed']),
      supabaseAdmin
        .from('website_visits')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('read', false),
    ])

    // Connect unread count — count channels with messages newer than read cursor
    let connectUnread = 0
    try {
      const { data: channels } = await supabaseAdmin
        .from('connect_channels')
        .select('id')
        .eq('tenant_id', tenantId)

      if (channels && channels.length > 0) {
        const { data: cursors } = await supabaseAdmin
          .from('connect_read_cursors')
          .select('channel_id, last_read_at')
          .eq('reader_type', 'owner')
          .eq('reader_id', userId)
          .in('channel_id', channels.map((c) => c.id))

        const cursorMap = new Map((cursors || []).map((c) => [c.channel_id, c.last_read_at]))

        for (const ch of channels) {
          const lastRead = cursorMap.get(ch.id)
          let q = supabaseAdmin
            .from('connect_messages')
            .select('id', { count: 'exact', head: true })
            .eq('channel_id', ch.id)
          if (lastRead) q = q.gt('created_at', lastRead)
          const { count } = await q
          if (count && count > 0) connectUnread++
        }
      }
    } catch {
      // Table may not exist yet
    }

    return NextResponse.json({
      clients: clientCount || 0,
      bookings: bookingCount || 0,
      leads: leadCount || 0,
      notifications: notificationCount || 0,
      connect: connectUnread,
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
