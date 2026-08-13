import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { approveQueueItem, dismissQueueItem } from '@/lib/client-dedupe'
import { ClientMergeError } from '@/lib/client-merge'

// Resolves one queued duplicate-client candidate: 'approve' merges it
// (human picks which side is canonical), 'dismiss' marks it reviewed and
// not a real duplicate. Gated on clients.delete -- same as
// /api/clients/merge -- since approve triggers the same
// consolidating/irreversible-in-effect merge that route does.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('clients.delete')
  if (authError) return authError
  const { id } = await params

  const db = tenantDb(tenant.tenantId)
  const { data: queueRow, error: queueError } = await db
    .from('client_dedupe_queue')
    .select('id, client_a_id, client_b_id, status')
    .eq('id', id)
    .single()
  if (queueError || !queueRow) {
    return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 })
  }
  if ((queueRow as { status: string }).status !== 'pending') {
    return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const action = body.action

  try {
    if (action === 'dismiss') {
      await dismissQueueItem({ tenantId: tenant.tenantId, queueId: id, reviewedBy: tenant.userId })
      return NextResponse.json({ status: 'dismissed' })
    }

    if (action === 'approve') {
      const row = queueRow as { client_a_id: string; client_b_id: string }
      const canonicalClientId = typeof body.canonical_id === 'string' ? body.canonical_id : row.client_a_id
      const duplicateClientId = canonicalClientId === row.client_a_id ? row.client_b_id : row.client_a_id
      const result = await approveQueueItem({
        tenantId: tenant.tenantId,
        queueId: id,
        canonicalClientId,
        duplicateClientId,
        reviewedBy: tenant.userId,
      })
      return NextResponse.json({ status: 'merged', merge: result })
    }

    return NextResponse.json({ error: "action must be 'approve' or 'dismiss'" }, { status: 400 })
  } catch (e) {
    if (e instanceof ClientMergeError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
