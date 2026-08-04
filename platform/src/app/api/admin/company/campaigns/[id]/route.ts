import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

// DELETE /api/admin/company/campaigns/[id] — drafts only, sent campaigns are a record.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await ctx.params
  const { error } = await supabaseAdmin.from('platform_campaigns').delete().eq('id', id).eq('status', 'draft')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
