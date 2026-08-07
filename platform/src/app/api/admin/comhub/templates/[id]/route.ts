import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requireComhubAccess } from '@/lib/comhub-access'

// DELETE /api/admin/comhub/templates/[id] — archives (soft delete)
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireComhubAccess()
  if (access instanceof NextResponse) return access
  const tenantId = access.tenantId

  const { id } = await ctx.params
  const { error } = await tenantDb(tenantId)
    .from('comhub_templates')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
