import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'

// Lists pending duplicate-client candidates a human needs to review --
// pairs the automated tier (src/lib/client-dedupe.ts) didn't consider safe
// to auto-merge (phone-only or email-only match, or a full match that
// tripped a safety guard). Surfaced at /dashboard/clients "Duplicates" tab.
export async function GET() {
  const { tenant, error: authError } = await requirePermission('clients.view')
  if (authError) return authError

  const db = tenantDb(tenant.tenantId)
  const { data: queueRows, error } = await db
    .from('client_dedupe_queue')
    .select('id, client_a_id, client_b_id, match_type, match_value, suggested_canonical_id, suggested_reason, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (queueRows || []) as {
    id: string
    client_a_id: string
    client_b_id: string
    match_type: string
    match_value: string
    suggested_canonical_id: string | null
    suggested_reason: string | null
    created_at: string
  }[]
  const clientIds = [...new Set(rows.flatMap((r) => [r.client_a_id, r.client_b_id]))]

  const { data: clientRows } = clientIds.length
    ? await db.from('clients').select('id, name, phone, email, created_at').in('id', clientIds)
    : { data: [] }
  const clientsById = new Map((clientRows || []).map((c: { id: string }) => [c.id, c]))

  const queue = rows.map((r) => ({
    ...r,
    client_a: clientsById.get(r.client_a_id) || null,
    client_b: clientsById.get(r.client_b_id) || null,
  }))

  return NextResponse.json({ queue })
}
