/**
 * Single checklist item — toggle done, edit label, delete. Office side.
 *
 * PATCH  { done?: boolean, label?: string } → { item }
 * DELETE → { ok: true }
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

type Params = { params: Promise<{ id: string; itemId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { id: jobId, itemId } = await params
    const db = tenantDb(tenantId)

    const body = (await request.json().catch(() => ({}))) as { done?: boolean; label?: string }
    const patch: Record<string, unknown> = {}
    if (body.done !== undefined) {
      patch.done = body.done
      patch.done_at = body.done ? new Date().toISOString() : null
    }
    if (body.label !== undefined) patch.label = body.label.trim()
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    const { data: item, error } = await db
      .from('job_checklist_items')
      .update(patch)
      .eq('id', itemId)
      .eq('job_id', jobId)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()
    if (error || !item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ item })
  } catch (err) {
    console.error('PATCH /api/jobs/[id]/checklist/[itemId]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { id: jobId, itemId } = await params
    const db = tenantDb(tenantId)

    const { error } = await db.from('job_checklist_items').delete().eq('id', itemId).eq('job_id', jobId).eq('tenant_id', tenantId)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/jobs/[id]/checklist/[itemId]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
