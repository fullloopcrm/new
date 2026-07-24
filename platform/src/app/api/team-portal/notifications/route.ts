import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'
import { sanitizePostgrestValue } from '@/lib/postgrest-safe'

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
      // Own notifications, or a genuine team-wide broadcast (recipient_id
      // NULL *and* recipient_type explicitly 'team_member'). Without the
      // recipient_type check, admin-only/audit rows that also leave
      // recipient_id unset (job broadcast summaries, referral/commission
      // alerts, 15-min warnings) matched `recipient_id.is.null` too and
      // leaked into every cleaner's feed company-wide.
      .or(`recipient_id.eq.${sanitizePostgrestValue(auth.id)},and(recipient_id.is.null,recipient_type.eq.team_member)`)
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
        .or(`recipient_id.eq.${sanitizePostgrestValue(auth.id)},and(recipient_id.is.null,recipient_type.eq.team_member)`)
        .eq('read', false)
    } else if (body.id) {
      // Only mark read if this notification is actually addressed to the
      // caller (or a genuine team-wide broadcast) — otherwise any team
      // member could silently mark another member's personal notification,
      // or a company-wide admin alert, as read.
      await tenantDb(auth.tid)
        .from('notifications')
        .update({ read: true })
        .eq('id', body.id)
        .or(`recipient_id.eq.${sanitizePostgrestValue(auth.id)},and(recipient_id.is.null,recipient_type.eq.team_member)`)
    }
  } catch {
    // Table may not exist yet
  }

  return NextResponse.json({ ok: true })
}
