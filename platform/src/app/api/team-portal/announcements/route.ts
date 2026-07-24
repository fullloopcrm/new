import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'

// Field-team read side of Team Announcements. Newest first, full history --
// this is what /team/rules (labeled "Announcements") renders.
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data, error } = await tenantDb(auth.tid)
    .from('team_announcements') // tenant-scope-ok: tenantDb() scopes the select; audit heuristic doesn't parse the wrapper
    .select('id, title_en, title_es, body_en, body_es, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ announcements: [] })
  return NextResponse.json({ announcements: data || [] })
}
