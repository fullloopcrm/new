import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePortalPermission } from '@/lib/team-portal-auth'

export async function GET(request: Request) {
  // Auth: field-staff bearer token. A member reads their OWN rating; the id
  // comes from the verified token and the lookup is scoped to the token tenant.
  const { auth, error: authErr } = await requirePortalPermission(request, 'jobs.view_own')
  if (authErr) return authErr

  const teamMemberId = auth.id
  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data, error } = (await tenantDb(auth.tid)
    .from('team_members')
    .select('avg_rating, rating_count')
    .eq('id', teamMemberId)
    .single()) as { data: { avg_rating: number | null; rating_count: number | null } | null; error: { message: string } | null }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    avg: data?.avg_rating != null ? Number(data.avg_rating) : null,
    count: data?.rating_count || 0,
  })
}
