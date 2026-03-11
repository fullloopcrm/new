import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../auth/route'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // Try notifications table first, fall back to empty
  try {
    const { data } = await supabaseAdmin
      .from('notifications')
      .select('id, title, message, type, read, booking_id, created_at')
      .eq('tenant_id', auth.tid)
      .or(`recipient_id.eq.${auth.id},recipient_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ notifications: data || [] })
  } catch {
    return NextResponse.json({ notifications: [] })
  }
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await request.json()

  try {
    if (body.mark_all_read) {
      await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('tenant_id', auth.tid)
        .or(`recipient_id.eq.${auth.id},recipient_id.is.null`)
        .eq('read', false)
    } else if (body.id) {
      await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('id', body.id)
        .eq('tenant_id', auth.tid)
    }
  } catch {
    // Table may not exist yet
  }

  return NextResponse.json({ ok: true })
}
