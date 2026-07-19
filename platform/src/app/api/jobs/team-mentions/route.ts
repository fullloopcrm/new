/**
 * Lightweight team-member lookup for @-mention autocomplete in the Job
 * notes field. Gated on bookings.view (not team.view) so it works for any
 * role that can see job detail, regardless of team.view overrides — same
 * rationale as the sales pipeline's /api/deals/team-mentions.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

export async function GET() {
  try {
    const { tenant, error } = await requirePermission('bookings.view')
    if (error) return error

    const { data, error: dbError } = await supabaseAdmin
      .from('team_members')
      .select('id, name')
      .eq('tenant_id', tenant.tenantId)
      .eq('status', 'active')
      .order('name')
    if (dbError) throw dbError

    return NextResponse.json(data || [])
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/jobs/team-mentions error:', err)
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
  }
}
