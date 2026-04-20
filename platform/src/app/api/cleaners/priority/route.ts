/**
 * Bulk priority reorder — tenant-scoped.
 * Ported from nycmaid. Reads/writes team_members.priority.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

export async function PUT(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  const body = await request.json()
  const { priorities } = body as { priorities: { id: string; priority: number }[] }

  if (!priorities || !Array.isArray(priorities)) {
    return NextResponse.json({ error: 'Invalid priorities array' }, { status: 400 })
  }

  for (const { id, priority } of priorities) {
    const { error } = await supabaseAdmin
      .from('team_members')
      .update({ priority })
      .eq('id', id)
      .eq('tenant_id', tenant.tenantId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
