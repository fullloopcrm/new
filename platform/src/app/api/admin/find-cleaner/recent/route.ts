import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

// Read-back of past cleaner-broadcast SMS blasts, including each recipient's
// phone number + reply text — the sibling POST /send (the action that
// creates this data) is gated behind campaigns.send; this reader previously
// only checked getTenantForRequest() (proves tenant membership at ANY role),
// so any staff-tier member (no campaigns.* by default) could read the whole
// feed. Gated behind campaigns.view — the read-tier used across every other
// GET/mutate pair in this codebase (settings.view/edit, schedules.view/edit).
export async function GET() {
  const { tenant, error: permError } = await requirePermission('campaigns.view')
  if (permError) return permError
  const tenantId = tenant.tenantId

  const { data: broadcasts, error } = await tenantDb(tenantId)
    .from('cleaner_broadcasts')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(10)
  if (error) return NextResponse.json({ broadcasts: [], error: error.message }, { status: 500 })

  const ids = (broadcasts || []).map((b) => b.id)
  if (ids.length === 0) return NextResponse.json({ broadcasts: [] })

  const { data: recipients } = await tenantDb(tenantId)
    .from('cleaner_broadcast_recipients')
    .select('id, broadcast_id, cleaner_id, phone, sent_at, replied_at, reply_text, status')
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
