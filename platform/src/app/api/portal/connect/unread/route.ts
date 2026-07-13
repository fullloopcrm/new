import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../../auth/token'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  try {
    const db = tenantDb(auth.tid)
    // tenantDb's select() widens the columns literal to `string`, so
    // postgrest-js can't statically parse the result shape here — cast at
    // this boundary (see admin/comhub/threads/[id]/route.ts for precedent).
    type ChannelRow = { id: string }
    type CursorRow = { last_read_at: string | null }

    // Get client channel
    const { data: channel } = (await db
      .from('connect_channels')
      .select('id')
      .eq('type', 'client')
      .eq('client_id', auth.id)
      .single()) as unknown as { data: ChannelRow | null }

    if (!channel) return NextResponse.json({ unread: 0 })

    // Get read cursor
    const { data: cursor } = (await db
      .from('connect_read_cursors')
      .select('last_read_at')
      .eq('channel_id', channel.id)
      .eq('reader_type', 'client')
      .eq('reader_id', auth.id)
      .single()) as unknown as { data: CursorRow | null }

    let query = db
      .from('connect_messages')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', channel.id)

    if (cursor?.last_read_at) {
      query = query.gt('created_at', cursor.last_read_at)
    }

    const { count } = await query

    return NextResponse.json({ unread: count || 0 })
  } catch {
    return NextResponse.json({ unread: 0 })
  }
}
