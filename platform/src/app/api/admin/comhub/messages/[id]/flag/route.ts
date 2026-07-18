import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { capString } from '@/lib/validate'

// POST /api/admin/comhub/messages/[id]/flag   { reason?: string }
//   Marks the message for prompt-improvement review.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  const { id } = await ctx.params
  const body = await req.json().catch(() => ({})) as { reason?: string }
  const { error } = await supabaseAdmin
    .from('comhub_messages')
    .update({
      flagged_for_review: true,
      flagged_reason: capString(body.reason, 2000),
      flagged_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — clears the flag
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  const { id } = await ctx.params
  const { error } = await supabaseAdmin
    .from('comhub_messages')
    .update({
      flagged_for_review: false,
      flagged_reason: null,
      flagged_at: null,
      flagged_by: null,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
