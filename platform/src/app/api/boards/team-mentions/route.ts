/**
 * Lightweight team-member lookup for @-mention autocomplete in the Task
 * Board item Updates composer. Gated on boards.view (mirrors
 * /api/deals/team-mentions, which is gated on sales.view instead) so it
 * works for any role that can see a board, regardless of team.view overrides.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

export async function GET() {
  try {
    const { tenant, error } = await requirePermission('boards.view')
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
    console.error('GET /api/boards/team-mentions error:', err)
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
  }
}
