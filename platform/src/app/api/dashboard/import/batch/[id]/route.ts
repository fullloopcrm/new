/**
 * Review / commit / undo one import batch. Tenant-scoped: a batch is only
 * reachable by the tenant that owns it.
 *
 * GET  → { review }
 * POST { action: 'commit' | 'undo' } → { result, review }
 */
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { getBatchReview, commitBatch, undoBatch } from '@/lib/import-staging'

/** Confirm the batch belongs to this tenant. */
async function ownsBatch(batchId: string, tenantId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('import_batches').select('tenant_id').eq('id', batchId).single()
  return !!data && data.tenant_id === tenantId
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('clients.create')
  if (authError) return authError
  const { id } = await params
  if (!(await ownsBatch(id, tenant.tenantId))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const review = await getBatchReview(id)
  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ review })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('clients.create')
  if (authError) return authError
  const { id } = await params
  if (!(await ownsBatch(id, tenant.tenantId))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { action } = (await request.json().catch(() => ({}))) as { action?: string }
  try {
    let result: unknown
    if (action === 'commit') result = await commitBatch(id)
    else if (action === 'undo') result = await undoBatch(id)
    else return NextResponse.json({ error: "action must be 'commit' or 'undo'" }, { status: 400 })
    const review = await getBatchReview(id)
    return NextResponse.json({ result, review })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Action failed' }, { status: 500 })
  }
}
