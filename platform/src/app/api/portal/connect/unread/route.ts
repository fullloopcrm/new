import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPortalToken } from '../../auth/route'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  try {
    // Get client channel
    const { data: channel } = await supabaseAdmin
      .from('connect_channels')
      .select('id')
      .eq('tenant_id', auth.tid)
      .eq('type', 'client')
      .eq('client_id', auth.id)
      .single()

    if (!channel) return NextResponse.json({ unread: 0 })

    // Get read cursor
    const { data: cursor } = await supabaseAdmin
      .from('connect_read_cursors')
      .select('last_read_at')
      .eq('channel_id', channel.id)
      .eq('reader_type', 'client')
      .eq('reader_id', auth.id)
      .single()

    let query = supabaseAdmin
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
