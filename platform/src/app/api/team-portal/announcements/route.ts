import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../auth/token'
import { requireActiveTeamMember } from '@/lib/team-portal-auth'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = corsPreflight

// Field-team read side of Team Announcements. Newest first, full history --
// this is what /team/rules (labeled "Announcements") renders.
export const GET = withMobileCors(async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // Instant revocation: announcements aren't tied to a specific
  // PortalPermission (every active member reads company announcements
  // regardless of role), so re-verify the member is still active rather
  // than gating on RBAC.
  const { error: statusError } = await requireActiveTeamMember(auth)
  if (statusError) return statusError

  const { data, error } = await tenantDb(auth.tid)
    .from('team_announcements') // tenant-scope-ok: tenantDb() scopes the select; audit heuristic doesn't parse the wrapper
    .select('id, title_en, title_es, body_en, body_es, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ announcements: [] })
  return NextResponse.json({ announcements: data || [] })
})
