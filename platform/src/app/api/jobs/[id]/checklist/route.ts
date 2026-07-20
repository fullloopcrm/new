/**
 * Job checklist — on-site to-do list, tenant-scoped, office side.
 *
 * GET  → { items: ChecklistItem[] }
 * POST → { label: string } → { item }
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.view')
    if (authError) return authError
    const { id: jobId } = await params
    const db = tenantDb(tenant.tenantId)

    const { data: items, error } = await db
      .from('job_checklist_items')
      .select('*')
      .eq('job_id', jobId)
      .order('sort_order')
    if (error) throw error

    return NextResponse.json({ items: items ?? [] })
  } catch (err) {
    console.error('GET /api/jobs/[id]/checklist', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { id: jobId } = await params
    const db = tenantDb(tenantId)

    const { data: job } = await db.from('jobs').select('id').eq('id', jobId).eq('tenant_id', tenantId).single()
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const { label } = await request.json().catch(() => ({}))
    const text = typeof label === 'string' ? label.trim() : ''
    if (!text) return NextResponse.json({ error: 'label required' }, { status: 400 })

    const { count } = await db.from('job_checklist_items').select('id', { count: 'exact', head: true }).eq('job_id', jobId)

    const { data: item, error } = await db
      .from('job_checklist_items')
      .insert({ tenant_id: tenantId, job_id: jobId, label: text, sort_order: count ?? 0 })
      .select('*')
      .single()
    if (error || !item) return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })

    return NextResponse.json({ item })
  } catch (err) {
    console.error('POST /api/jobs/[id]/checklist', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
