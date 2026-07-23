import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET() {
  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
  const tenantId = ctx.tenantId

  const { data: broadcasts, error } = await tenantDb(tenantId)
    .from('cleaner_broadcasts')
    .select('*, clients(name)')
    .order('sent_at', { ascending: false })
    .limit(10)
  if (error) return NextResponse.json({ broadcasts: [], error: error.message }, { status: 500 })

  const ids = (broadcasts || []).map((b) => b.id)
  if (ids.length === 0) return NextResponse.json({ broadcasts: [] })

  const { data: recipients } = await tenantDb(tenantId)
    .from('cleaner_broadcast_recipients')
    .select('id, broadcast_id, cleaner_id, phone, sent_at, replied_at, reply_text, status, team_members(name)')
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
