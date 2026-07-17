/**
 * A team member's post-job ratings + feedback text, collected entirely over
 * SMS by lib/nycmaid/review-engine.ts (the same engine that writes
 * client_reviews — see /api/client-reviews for that half). Until this route
 * existed, `ratings` had no reader anywhere except the aggregate
 * avg_rating/rating_count roll-up on team_members and one AI-tool lookup
 * (lib/selena/tools.ts) — the actual free-text feedback a client leaves on a
 * <5 rating (the thing review-engine.ts's own comment says exists to drive
 * follow-up) had no dashboard surface at all.
 *
 * GET — this member's ratings, newest first, tenant-scoped via team_members
 * ownership check (same assertMember pattern as the hr documents route).
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant, error: authError } = await requirePermission('team.view')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params

    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data, error } = await supabaseAdmin
      .from('ratings')
      .select('*, clients(name)')
      .eq('tenant_id', tenantId)
      .eq('team_member_id', id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ratings: data ?? [] })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
