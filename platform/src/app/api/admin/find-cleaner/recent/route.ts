import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

export async function GET() {
  const { tenant: ctx, error: authError } = await requirePermission('team.edit')
  if (authError) return authError
  const tenantId = ctx.tenantId

  const { data: broadcasts, error } = await supabaseAdmin
    .from('cleaner_broadcasts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sent_at', { ascending: false })
    .limit(10)
  if (error) return NextResponse.json({ broadcasts: [], error: error.message }, { status: 500 })

  const ids = (broadcasts || []).map((b) => b.id)
  if (ids.length === 0) return NextResponse.json({ broadcasts: [] })

  const { data: recipients } = await supabaseAdmin
    .from('cleaner_broadcast_recipients')
    .select('id, broadcast_id, cleaner_id, phone, sent_at, replied_at, reply_text, status')
    .eq('tenant_id', tenantId)
    .in('broadcast_id', ids)

  const recipsByBroadcast = new Map<string, unknown[]>()
  for (const r of recipients || []) {
    const list = recipsByBroadcast.get(r.broadcast_id) || []
    list.push(r)
    recipsByBroadcast.set(r.broadcast_id, list)
  }

  return NextResponse.json({
    broadcasts: (broadcasts || []).map((b) => ({ ...b, recipients: recipsByBroadcast.get(b.id) || [] })),
  })
}
