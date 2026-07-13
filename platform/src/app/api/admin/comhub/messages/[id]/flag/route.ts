import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'

// POST /api/admin/comhub/messages/[id]/flag   { reason?: string }
//   Marks the message for prompt-improvement review.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const db = tenantDb(tenantId)

  const { id } = await ctx.params
  const body = await req.json().catch(() => ({})) as { reason?: string }
  const { error } = await db
    .from('comhub_messages')
    .update({
      flagged_for_review: true,
      flagged_reason: body.reason || null,
      flagged_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — clears the flag
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const db = tenantDb(tenantId)

  const { id } = await ctx.params
  const { error } = await db
    .from('comhub_messages')
    .update({
      flagged_for_review: false,
      flagged_reason: null,
      flagged_at: null,
      flagged_by: null,
    })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
