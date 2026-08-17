/**
 * Dashboard-user lookup for the Task Board's assignee dropdown and @-mention
 * autocomplete in the Updates composer. Gated on boards.view (mirrors
 * /api/deals/team-mentions, which is gated on sales.view instead) so it
 * works for any role that can see a board, regardless of team.view overrides.
 *
 * Sourced from `tenant_members` (dashboard/operator accounts), NOT
 * `team_members` (the field-worker/cleaner roster) — the Task Board assigns
 * work to office staff, not cleaners. Restricted to exactly owner/admin/
 * virtual_assistant per Jeff's 2026-08-12 correction; 'manager' and 'staff'
 * are deliberately excluded, not an oversight.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { BOARD_ASSIGNABLE_ROLES } from '@/lib/boards'

export async function GET() {
  try {
    const { tenant, error } = await requirePermission('boards.view')
    if (error) return error

    const { data, error: dbError } = await supabaseAdmin
      .from('tenant_members')
      .select('id, name')
      .eq('tenant_id', tenant.tenantId)
      .eq('is_active', true)
      .in('role', BOARD_ASSIGNABLE_ROLES)
      .order('name')
    if (dbError) throw dbError

    return NextResponse.json(data || [])
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/boards/team-mentions error:', err)
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
  }
}
