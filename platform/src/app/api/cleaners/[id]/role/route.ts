/**
 * Set a field-staff member's portal tier (worker/lead/manager) in isolation,
 * without touching their schedule/profile fields. Drives portal permissions.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { isPortalRole } from '@/lib/portal-rbac'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  const { id } = await params
  const { role } = await request.json().catch(() => ({}))

  if (!isPortalRole(role)) {
    return NextResponse.json({ error: 'Invalid role. Must be: worker, lead, manager' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('team_members')
    .update({ role })
    .eq('id', id)
    .eq('tenant_id', tenant.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, role })
}
