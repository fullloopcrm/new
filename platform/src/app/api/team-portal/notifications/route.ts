import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // Try notifications table first, fall back to empty
  try {
    const { data } = await tenantDb(auth.tid)
      .from('notifications') // tenant-scope-ok: tenantDb() scopes the select; audit heuristic doesn't parse the wrapper
      .select('id, title, message, type, read, booking_id, created_at')
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
      await tenantDb(auth.tid)
        .from('notifications')
        .update({ read: true })
        .or(`recipient_id.eq.${auth.id},recipient_id.is.null`)
        .eq('read', false)
    } else if (body.id) {
      // Only mark read if this notification is actually addressed to the
      // caller (or tenant-wide) — otherwise any team member could silently
      // mark another member's personal notification as read.
      await tenantDb(auth.tid)
        .from('notifications')
        .update({ read: true })
        .eq('id', body.id)
        .or(`recipient_id.eq.${auth.id},recipient_id.is.null`)
    }
  } catch {
    // Table may not exist yet
  }

  return NextResponse.json({ ok: true })
}
